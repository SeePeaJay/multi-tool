import { HocuspocusProvider, TiptapCollabProvider } from "@hocuspocus/provider";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useState,
} from "react";
import * as Y from "yjs";
import {
  MarkNoteAsActiveArgs,
  MarkNoteAsInactiveArgs,
  SetupTempProviderArgs,
  useCollabResourcesHelpers,
} from "../hooks/collab-resources-helpers";
import { useAuth } from "./AuthContext";

export interface CollabResourcesContextType {
  metadataProviderRef: React.MutableRefObject<HocuspocusProvider | null>;
  metadataYdocRef: React.MutableRefObject<Y.Doc>;
  activeYdocResourcesRef: React.MutableRefObject<ActiveYdocResources>;
  currentAwarenessStateRef: React.MutableRefObject<CurrentAwarenessState>;
  tempProviderResourcesRef: React.MutableRefObject<TempProviderResources>;
  pendingNotesRef: React.MutableRefObject<Set<string>>;
  updatePendingNotes: (updateType: "add" | "delete", noteId: string) => void;
  currentEditorNoteId: React.MutableRefObject<string>;
  starredAndMetadataAreReady: boolean;
  markNoteAsActive: (params: MarkNoteAsActiveArgs) => Y.Doc;
  markNoteAsInactive: (params: MarkNoteAsInactiveArgs) => void;
  setupTempProvider: (params: SetupTempProviderArgs) => void;
  setupMetadataProvider: () => void;
}
export interface CurrentAwarenessState {
  [key: string]: string;
}

export interface ActiveYdocResources {
  [key: string]: {
    /* The ydoc that represents the current note. */
    ydoc: Y.Doc;
    /* The provider instance responsible for syncing with the server. */
    provider: TiptapCollabProvider | null;
    /* The number of connected clients actively editting the current note. */
    activeClientCount: number;
  };
}

export interface TempProviderResources {
  [key: string]: Set<{
    /* The provider instance responsible for syncing with the server. */
    provider: TiptapCollabProvider;
    /* Indicates whether the provider will send a "temp" stateless message on sync. This will prompt other clients to create their own temp providers to receive the update from the server. */
    providerWillSendMsg: boolean;
  }>;
}

const CollabResourcesContext = createContext<
  CollabResourcesContextType | undefined
>(undefined);

export const CollabResourcesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { currentUser } = useAuth();

  /* A global provider (one per client) that handles stateless messages and awareness updates. */
  const metadataProviderRef = useRef<HocuspocusProvider | null>(null);

  const metadataYdocRef = useRef<Y.Doc>(new Y.Doc());

  /* The latest snapshot of the awareness state, mapping each client to the id of the note they're working on. */
  const currentAwarenessStateRef = useRef<CurrentAwarenessState>({});

  /* A ref holding resources for all notes that are currently being edited by at least one connected client. */
  const activeYdocResourcesRef = useRef<ActiveYdocResources>({});

  /*
   * A ref storing temporary providers for notes.
   * Each provider is destroyed (and removed from this object) once synchronization with the server is complete.
   */
  const tempProviderResourcesRef = useRef<TempProviderResources>({});

  const pendingNotesRef = useRef<Set<string>>(
    new Set(
      localStorage.getItem("pendingNotes")
        ? localStorage.getItem("pendingNotes")?.split(",")
        : [],
    ),
  );

  function updatePendingNotes(updateType: "add" | "delete", noteId: string) {
    if (updateType === "add") {
      pendingNotesRef.current.add(noteId);
    } else {
      pendingNotesRef.current.delete(noteId);
    }

    localStorage.setItem(
      "pendingNotes",
      Array.from(pendingNotesRef.current).join(","),
    );
  }

  /*
   * The most recent snapshot of the id for the note that the current editor is working on.
   * This is used to determine whether the editor is making the first `markNoteAsActive` call for that note.
   */
  const currentEditorNoteId = useRef("");

  /* A variable that prevents editor from rendering until default note data are init */
  const [starredAndMetadataAreReady, setStarredAndMetadataAreReady] =
    useState(false);

  const {
    markNoteAsActive,
    markNoteAsInactive,
    setupMetadataYdoc,
    setupTempProvider,
    setupMetadataProvider,
    destroyCollabResources,
    ensureStarredExists,
  } = useCollabResourcesHelpers({
    metadataProviderRef,
    metadataYdocRef,
    activeYdocResourcesRef,
    currentEditorNoteId,
    currentAwarenessStateRef,
    tempProviderResourcesRef,
    pendingNotesRef,
    updatePendingNotes,
  });

  useEffect(() => {
    async function setupStarredAndMetadata() {
      await setupMetadataYdoc({
        metadataYdoc: metadataYdocRef.current,
      });

      await ensureStarredExists();

      setStarredAndMetadataAreReady(true);
    }

    setupStarredAndMetadata();
  }, []);

  /* After above effect is completed, setup providers if currentUser is defined */
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setupMetadataProvider();

    window.addEventListener("beforeunload", destroyCollabResources);

    return () => {
      destroyCollabResources();
      window.removeEventListener("beforeunload", destroyCollabResources);
    };
  }, [currentUser]);

  return (
    <CollabResourcesContext.Provider
      value={{
        metadataProviderRef,
        metadataYdocRef,
        activeYdocResourcesRef,
        currentAwarenessStateRef,
        tempProviderResourcesRef,
        pendingNotesRef,
        updatePendingNotes,
        currentEditorNoteId,
        starredAndMetadataAreReady,
        markNoteAsActive,
        markNoteAsInactive,
        setupTempProvider,
        setupMetadataProvider,
      }}
    >
      {children}
    </CollabResourcesContext.Provider>
  );
};

export const useCollabResources = () => {
  const context = useContext(CollabResourcesContext);
  if (!context) {
    throw new Error(
      "useCollabResources must be used within a CollabResourcesProvider",
    );
  }
  return context;
};
