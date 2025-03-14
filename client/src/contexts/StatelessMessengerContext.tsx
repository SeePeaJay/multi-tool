import { HocuspocusProvider, TiptapCollabProvider } from "@hocuspocus/provider";
import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Y from "yjs";
import { db } from "../db";
import { useAuth } from "./AuthContext";
import setupYdoc from "../utils/yjs";

interface StatelessMessengerContextType {
  statelessMessengerRef: React.MutableRefObject<HocuspocusProvider | null>;
  activeYdocResourcesRef: React.MutableRefObject<ActiveYdocResources>;
  markNoteAsActive: MarkNoteAsActiveFn;
  markNoteAsInactive: MarkNoteAsInactiveFn;
}
interface CurrentAwarenessState {
  [key: string]: string;
}
interface ActiveYdocResources {
  [key: string]: {
    ydoc: Y.Doc;
    provider: TiptapCollabProvider;
    activeClientCount: number;
  };
}

type MarkNoteAsActiveFn = (params: {
  noteId: string;
  isFromEditor?: boolean;
}) => Y.Doc;
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

  const noteIdParamRef = useRef<string | null>(null);
  const statelessMessengerRef = useRef<HocuspocusProvider | null>(null);
  const currentAwarenessStateRef = useRef<CurrentAwarenessState>({});
  const activeYdocResourcesRef = useRef<ActiveYdocResources>({});

  const currentEditorNoteId = useRef("");

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

      console.log(
        `marked note ${noteId} as active for the first time: `,
        activeYdocResourcesRef.current,
      );

      return ydoc;
    }

    // Otherwise, increment count for number of connected clients for this note, and return the ydoc
    activeYdocResourcesRef.current[noteId].activeClientCount++;

    console.log(
      `incrementing active count for note ${noteId}: `,
      activeYdocResourcesRef.current,
    );

    return activeYdocResourcesRef.current[noteId].ydoc;
  };

  const markNoteAsInactive: MarkNoteAsInactiveFn = ({
    noteId,
    isFromEditor,
  }) => {
    if (isFromEditor && currentEditorNoteId.current === noteId) {
      currentEditorNoteId.current = "";
    }

    activeYdocResourcesRef.current[noteId].activeClientCount--;

    if (activeYdocResourcesRef.current[noteId].activeClientCount === 0) {
      activeYdocResourcesRef.current[noteId].provider.destroy();
      delete activeYdocResourcesRef.current[noteId];
    }

    console.log(
      `note ${noteId} marked as inactive: `,
      activeYdocResourcesRef.current,
    );
  };

  useEffect(() => {
    noteIdParamRef.current = location.pathname.startsWith("/app/notes/")
      ? location.pathname.replace("/app/notes/", "")
      : null;
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
        const { noteId, title, ydocArray } = msg;

        if (msg.type === "rename") {
          db.notes.update(noteId, { title });
        } else if (msg.type === "create") {
          db.notes.put({
            id: noteId,
            title,
            content: `<p class="frontmatter"></p><p></p>`,
            ydocArray,
            hasFetchedBacklinks: true,
          });
        } else if (msg.type === "delete") {
          db.notes.delete(noteId);

          if (noteIdParamRef.current === noteId) {
            navigate("/app/notes", { replace: true });
          }
        }
      },
      onAwarenessChange: ({ states }) => {
        console.log(
          "awareness change: ",
          currentAwarenessStateRef.current,
          states,
        );

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
