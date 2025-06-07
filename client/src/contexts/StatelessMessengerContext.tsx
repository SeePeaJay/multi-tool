import { HocuspocusProvider, TiptapCollabProvider } from "@hocuspocus/provider";
import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Y from "yjs";
import { db } from "../db";
import { setupYdoc } from "../utils/yjs";
import { useAuth } from "./AuthContext";

interface StatelessMessengerContextType {
  statelessMessengerRef: React.MutableRefObject<HocuspocusProvider | null>;
  activeYdocResourcesRef: React.MutableRefObject<ActiveYdocResources>;
  tempYdocResourcesRef: React.MutableRefObject<TempYdocResources>;
  markNoteAsActive: MarkNoteAsActiveFn;
  markNoteAsInactive: MarkNoteAsInactiveFn;
}
interface CurrentAwarenessState {
  [key: string]: string;
}

/**
 * @property {Y.Doc} ydoc - The ydoc that represents the current note.
 * @property {TiptapCollabProvider} provider - The provider instance responsible for syncing with the server.
 * @property {number} activeClientCount - The number of connected clients actively editting the current note.
 */
interface ActiveYdocResources {
  [key: string]: {
    ydoc: Y.Doc;
    provider: TiptapCollabProvider;
    activeClientCount: number;
  };
}

/**
 * @property {TiptapCollabProvider} provider - The provider instance responsible for syncing with the server.
 * @property {boolean} providerWillSendMsg - Indicates whether the provider will send a "temp" stateless message on
 * sync. This will prompt other clients to create their own temp providers to receive the update from the server.
 */
interface TempYdocResources {
  [key: string]: {
    provider: TiptapCollabProvider;
    providerWillSendMsg: boolean;
  };
}

/**
 * @param {number} noteId - The id of the note.
 * @param {number} isFromEditor - Whether the caller is the current editor component.
 * @returns {Y.Doc} The ydoc representing the note.
 */
type MarkNoteAsActiveFn = (params: {
  noteId: string;
  isFromEditor?: boolean;
}) => Y.Doc;

/**
 * @param {number} noteId - The id of the note.
 * @param {number} isFromEditor - Whether the caller is the current editor component.
 * @returns {void}
 */
type MarkNoteAsInactiveFn = (params: {
  noteId: string;
  isFromEditor?: boolean;
}) => void;

const StatelessMessengerContext = createContext<
  StatelessMessengerContextType | undefined
>(undefined);

export const StatelessMessengerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // A global provider (one per client) that handles stateless messages and awareness updates.
  const statelessMessengerRef = useRef<HocuspocusProvider | null>(null);

  // The latest snapshot of the awareness state, mapping each client to the id of the note they're working on.
  const currentAwarenessStateRef = useRef<CurrentAwarenessState>({});

  // A ref holding resources for all notes that are currently being edited by at least one connected client.
  const activeYdocResourcesRef = useRef<ActiveYdocResources>({});

  // A ref storing temporary providers for notes.
  // Each provider is destroyed (and removed from this object) once synchronization with the server is complete.
  const tempYdocResourcesRef = useRef<TempYdocResources>({});

  // The most recent snapshot of the id for the note that the current editor is working on.
  // This is used to determine whether the editor is making the first `markNoteAsActive` call for that note.
  const currentEditorNoteId = useRef("");

  // A copy of location pathname to avoid stale closure below
  const locationPathnameRef = useRef("");

  // Marks a note as active (some client's editor is editting the note).
  const markNoteAsActive: MarkNoteAsActiveFn = ({ noteId, isFromEditor }) => {
    // If this is not the first function call from the editor (for the current note id), return the existing Yjs doc.
    // This is necessary because of the way the fn is invoked in the component (can get called multiple times).
    if (isFromEditor && currentEditorNoteId.current === noteId) {
      return activeYdocResourcesRef.current[noteId].ydoc;
    }

    // Otherwise (if this is the first function call for the current note), mark it as such and continue.
    if (isFromEditor && currentEditorNoteId.current !== noteId) {
      currentEditorNoteId.current = noteId;
    }

    // If note isn't marked as active yet, mark it as active, and return ydoc (in case it's for editor)
    if (!activeYdocResourcesRef.current[noteId]) {
      const ydoc = new Y.Doc();

      setupYdoc({ noteId, ydoc });

      activeYdocResourcesRef.current[noteId] = {
        ydoc,
        provider: new TiptapCollabProvider({
          name: `${currentUser}/${noteId}`, // unique document identifier for syncing
          baseUrl: "ws://127.0.0.1:1234",
          token: "notoken", // your JWT token
          document: ydoc,
        }),
        activeClientCount: 1,
      };

      // console.log(
      //   `marked note ${noteId} as active for the first time: `,
      //   activeYdocResourcesRef.current,
      // );

      return ydoc;
    }

    // Increment count for number of connected clients actively editting the note.
    activeYdocResourcesRef.current[noteId].activeClientCount++;

    // console.log(
    //   `incrementing active count for note ${noteId}: `,
    //   activeYdocResourcesRef.current,
    // );

    return activeYdocResourcesRef.current[noteId].ydoc;
  };

  // Marks a note as inactive.
  const markNoteAsInactive: MarkNoteAsInactiveFn = ({
    noteId,
    isFromEditor,
  }) => {
    if (isFromEditor && currentEditorNoteId.current === noteId) {
      currentEditorNoteId.current = "";
    }

    // Decrement count for number of connected clients actively editting the note.
    activeYdocResourcesRef.current[noteId].activeClientCount--;

    // If there are no connected clients editting the note, then we can safely destroy and delete the provider.
    if (activeYdocResourcesRef.current[noteId].activeClientCount === 0) {
      activeYdocResourcesRef.current[noteId].provider.destroy();
      delete activeYdocResourcesRef.current[noteId];
    }

    // console.log(
    //   `note ${noteId} marked as inactive: `,
    //   activeYdocResourcesRef.current,
    // );
  };

  useEffect(() => {
    locationPathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const activeYdocResources = activeYdocResourcesRef.current;

    const statelessMessenger = new HocuspocusProvider({
      name: currentUser,
      url: "ws://127.0.0.1:1234",
      onStateless: ({ payload }) => {
        const msg = JSON.parse(payload);
        const { noteId, title, ydocArray, clientId } = msg;

        if (clientId === statelessMessenger.document.clientID) {
          return;
        }

        if (msg.type === "rename") {
          db.notes.update(noteId, { title });
        } else if (msg.type === "create") {
          db.notes.put({
            id: noteId,
            title,
            content: `<p class="frontmatter"></p><p></p>`,
            contentWords: [""],
            ydocArray,
          });
        } else if (msg.type === "delete") {
          db.notes.delete(noteId);

          if (locationPathnameRef.current === `/app/notes/${noteId}`) {
            navigate("/app/notes", { replace: true });
          }
        } else if (msg.type === "temp") {
          if (tempYdocResourcesRef.current[noteId]) {
            return;
          }

          // console.log("creating temp provider for stateless");

          const ydoc = new Y.Doc();
          setupYdoc({ noteId, ydoc });

          tempYdocResourcesRef.current[noteId] = {
            provider: new TiptapCollabProvider({
              name: `${currentUser}/${noteId}`, // unique document identifier for syncing
              baseUrl: "ws://127.0.0.1:1234",
              token: "notoken", // your JWT token
              document: ydoc,
              onSynced() {
                // console.log("destroying temp provider for stateless");

                tempYdocResourcesRef.current[noteId].provider.destroy();
                delete tempYdocResourcesRef.current[noteId];
              },
            }),
            providerWillSendMsg: false,
          };
        }
      },
      onAwarenessChange: ({ states }) => {
        const updatedAwarenessState = states.reduce<CurrentAwarenessState>(
          (acc, state) => {
            // only assign if it exists
            if (state.currentNote) {
              acc[state.clientId] = state.currentNote;
            }

            return acc;
          },
          {},
        );

        // console.log(
        //   "awareness change: ",
        //   currentAwarenessStateRef.current,
        //   updatedAwarenessState,
        // );

        const allClientIds = new Set([
          ...Object.keys(currentAwarenessStateRef.current),
          ...Object.keys(updatedAwarenessState),
        ]);

        for (const clientId of allClientIds) {
          // current editor already marked the note as active; no need to handle it here an extra time
          if (statelessMessenger.document.clientID.toString() === clientId) {
            continue;
          }

          const clientIdIsInCurrent = Object.keys(
            currentAwarenessStateRef.current,
          ).includes(clientId);
          const clientIdIsInUpdated = Object.keys(
            updatedAwarenessState,
          ).includes(clientId);

          if (!clientIdIsInCurrent && clientIdIsInUpdated) {
            const noteIdToFollow = updatedAwarenessState[clientId];

            markNoteAsActive({ noteId: noteIdToFollow });
          } else if (!clientIdIsInUpdated && clientIdIsInCurrent) {
            const noteIdToUnfollow = currentAwarenessStateRef.current[clientId];

            markNoteAsInactive({ noteId: noteIdToUnfollow });
          }
        }

        currentAwarenessStateRef.current = updatedAwarenessState;
      },
    });
    statelessMessengerRef.current = statelessMessenger;

    const handleBeforeUnload = () => {
      statelessMessenger.destroy();

      Object.values(activeYdocResources).forEach((resource) => {
        resource.provider.destroy();
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      statelessMessenger.destroy();

      Object.values(activeYdocResources).forEach((resource) => {
        resource.provider.destroy();
      });

      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentUser]);

  return (
    <StatelessMessengerContext.Provider
      value={{
        statelessMessengerRef,
        activeYdocResourcesRef,
        tempYdocResourcesRef,
        markNoteAsActive,
        markNoteAsInactive,
      }}
    >
      {children}
    </StatelessMessengerContext.Provider>
  );
};

// custom hook to use the Hocuspocus context
export const useStatelessMessenger = () => {
  const context = useContext(StatelessMessengerContext);
  if (!context) {
    throw new Error(
      "useStatelessMessenger must be used within a StatelessMessengerProvider",
    );
  }
  return context;
};
