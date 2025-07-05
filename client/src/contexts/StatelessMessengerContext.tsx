import { HocuspocusProvider, TiptapCollabProvider } from "@hocuspocus/provider";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDefaultYdocUpdate } from "shared";
import * as Y from "yjs";
import { db } from "../db";
import {
  setupYdoc,
  setupMetadataYdoc,
  setupTempProvider,
  getMetadataProvider,
} from "../utils/yjs";
import { useAuth } from "./AuthContext";
import { useSession } from "./SessionContext";

interface StatelessMessengerContextType {
  statelessMessengerRef: React.MutableRefObject<HocuspocusProvider | null>;
  metadataYdocRef: React.MutableRefObject<Y.Doc>;
  activeYdocResourcesRef: React.MutableRefObject<ActiveYdocResources>;
  currentAwarenessStateRef: React.MutableRefObject<CurrentAwarenessState>;
  tempYdocResourcesRef: React.MutableRefObject<TempYdocResources>;
  noteIdsWithPendingUpdates: Set<string>;
  setNoteIdsWithPendingUpdates: React.Dispatch<React.SetStateAction<Set<string>>>;
  locationPathnameRef: React.MutableRefObject<string>;
  starredId: string;
  markNoteAsActive: MarkNoteAsActiveFn;
  markNoteAsInactive: MarkNoteAsInactiveFn;
}
export interface CurrentAwarenessState {
  [key: string]: string;
}

/**
 * @property {Y.Doc} ydoc - The ydoc that represents the current note.
 * @property {TiptapCollabProvider} provider - The provider instance responsible for syncing with the server.
 * @property {number} activeClientCount - The number of connected clients actively editting the current note.
 */
export interface ActiveYdocResources {
  [key: string]: {
    ydoc: Y.Doc;
    provider: TiptapCollabProvider | null;
    activeClientCount: number;
  };
}

/**
 * @property {TiptapCollabProvider} provider - The provider instance responsible for syncing with the server.
 * @property {boolean} providerWillSendMsg - Indicates whether the provider will send a "temp" stateless message on
 * sync. This will prompt other clients to create their own temp providers to receive the update from the server.
 */
export interface TempYdocResources {
  [key: string]: Set<TiptapCollabProvider>;
}

/**
 * @param {number} noteId - The id of the note.
 * @param {number} isFromEditor - Whether the caller is the current editor component.
 * @returns {Y.Doc} The ydoc representing the note.
 */
export type MarkNoteAsActiveFn = (params: {
  noteId: string;
  isFromEditor?: boolean;
}) => Y.Doc;

/**
 * @param {number} noteId - The id of the note.
 * @param {number} isFromEditor - Whether the caller is the current editor component.
 * @returns {void}
 */
export type MarkNoteAsInactiveFn = (params: {
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
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnectedToServerRef } = useSession();

  // A global provider (one per client) that handles stateless messages and awareness updates.
  const statelessMessengerRef = useRef<HocuspocusProvider | null>(null);

  const metadataYdocRef = useRef<Y.Doc>(new Y.Doc());

  // The latest snapshot of the awareness state, mapping each client to the id of the note they're working on.
  const currentAwarenessStateRef = useRef<CurrentAwarenessState>({});

  // A ref holding resources for all notes that are currently being edited by at least one connected client.
  const activeYdocResourcesRef = useRef<ActiveYdocResources>({});

  // A ref storing temporary providers for notes.
  // Each provider is destroyed (and removed from this object) once synchronization with the server is complete.
  const tempYdocResourcesRef = useRef<TempYdocResources>({});

  const [noteIdsWithPendingUpdates, setNoteIdsWithPendingUpdates] = useState<
    Set<string>
  >(
    new Set(
      localStorage.getItem("noteIdsWithPendingUpdates")
        ? localStorage.getItem("noteIdsWithPendingUpdates")?.split(",")
        : [],
    ),
  );

  // The most recent snapshot of the id for the note that the current editor is working on.
  // This is used to determine whether the editor is making the first `markNoteAsActive` call for that note.
  const currentEditorNoteId = useRef("");

  // A copy of location pathname to avoid stale closure below
  const locationPathnameRef = useRef("");

  // maintain a starred id variable from localStorage that can be checked synchronously for starred's existence
  const [starredId, setStarredId] = useState(() => {
    const storedStarredId = localStorage.getItem("starredId");
    return storedStarredId || "";
  });

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
        provider: isConnectedToServerRef.current
          ? new TiptapCollabProvider({
              name: `${currentUser}/${noteId}`, // unique document identifier for syncing
              baseUrl: "ws://localhost:5173/collaboration",
              token: "notoken", // your JWT token
              document: ydoc,
            })
          : null,
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
      activeYdocResourcesRef.current[noteId].provider?.destroy();

      if (isConnectedToServerRef.current) {
        setupTempProvider({
          currentUser,
          noteId,
          ydoc: activeYdocResourcesRef.current[noteId].ydoc,
          statelessMessengerRef,
          tempYdocResourcesRef,
        });
      } else {
        setNoteIdsWithPendingUpdates((prev) => new Set(prev).add(noteId));
      }

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
    localStorage.setItem(
      "noteIdsWithPendingUpdates",
      Array.from(noteIdsWithPendingUpdates).join(","),
    );
  }, [noteIdsWithPendingUpdates]);

  useEffect(() => {
    const ensureStarred = async () => {
      if (!starredId) {
        await db.notes.put({
          id: "starred", // a fixed id since Starred is unique and this makes it easy to merge two Starred
          title: "Starred",
          content: `<p class="frontmatter"></p><p></p>`,
          contentWords: [""],
          ydocArray: Array.from(getDefaultYdocUpdate()),
        });

        setStarredId("starred");
        localStorage.setItem("starredId", "starred");
      }
    };

    setupMetadataYdoc({
      metadataYdoc: metadataYdocRef.current,
      locationPathnameRef,
      navigate,
    }).then(() => {
      if (isConnectedToServerRef.current) {
        statelessMessengerRef.current = getMetadataProvider({
          currentUser,
          metadataYdocRef,
          currentAwarenessStateRef,
          tempYdocResourcesRef,
          markNoteAsActive,
          markNoteAsInactive,
        });
      }

      ensureStarred();
    });

    const handleBeforeUnload = () => {
      const activeYdocResources = activeYdocResourcesRef.current;

      statelessMessengerRef.current?.destroy();

      Object.values(activeYdocResources).forEach((resource) => {
        resource.provider?.destroy();
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <StatelessMessengerContext.Provider
      value={{
        statelessMessengerRef,
        metadataYdocRef,
        activeYdocResourcesRef,
        currentAwarenessStateRef,
        tempYdocResourcesRef,
        noteIdsWithPendingUpdates,
        setNoteIdsWithPendingUpdates,
        locationPathnameRef,
        starredId,
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
