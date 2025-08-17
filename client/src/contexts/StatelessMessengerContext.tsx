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
  useStatelessMessengerHelpers,
} from "../utils/statelessMessengerHelpers";
import { useAuth } from "./AuthContext";

export interface StatelessMessengerContextType {
  statelessMessengerRef: React.MutableRefObject<HocuspocusProvider | null>;
  metadataYdocRef: React.MutableRefObject<Y.Doc>;
  activeYdocResourcesRef: React.MutableRefObject<ActiveYdocResources>;
  currentAwarenessStateRef: React.MutableRefObject<CurrentAwarenessState>;
  tempProviderResourcesRef: React.MutableRefObject<TempProviderResources>;
  noteIdsWithPendingUpdates: Set<string>;
  setNoteIdsWithPendingUpdates: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  currentEditorNoteId: React.MutableRefObject<string>;
  starredAndMetadataAreReady: boolean;
  markNoteAsActive: (params: MarkNoteAsActiveArgs) => Y.Doc;
  markNoteAsInactive: (params: MarkNoteAsInactiveArgs) => void;
  setupTempProvider: (params: SetupTempProviderArgs) => void;
  setupCollabProviders: () => void;
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
export interface TempProviderResources {
  [key: string]: Set<{
    provider: TiptapCollabProvider;
    providerWillSendMsg: boolean;
  }>;
}

const StatelessMessengerContext = createContext<
  StatelessMessengerContextType | undefined
>(undefined);

export const StatelessMessengerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { currentUser } = useAuth();

  // A global provider (one per client) that handles stateless messages and awareness updates.
  const statelessMessengerRef = useRef<HocuspocusProvider | null>(null);

  const metadataYdocRef = useRef<Y.Doc>(new Y.Doc());

  // The latest snapshot of the awareness state, mapping each client to the id of the note they're working on.
  const currentAwarenessStateRef = useRef<CurrentAwarenessState>({});

  // A ref holding resources for all notes that are currently being edited by at least one connected client.
  const activeYdocResourcesRef = useRef<ActiveYdocResources>({});

  // A ref storing temporary providers for notes.
  // Each provider is destroyed (and removed from this object) once synchronization with the server is complete.
  const tempProviderResourcesRef = useRef<TempProviderResources>({});

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

  // a variable that prevents editor from rendering until default note data are init
  const [starredAndMetadataAreReady, setStarredAndMetadataAreReady] =
    useState(false);

  const {
    markNoteAsActive,
    markNoteAsInactive,
    setupMetadataYdoc,
    setupTempProvider,
    setupCollabProviders,
    destroyCollabResources,
    ensureStarredExists,
  } = useStatelessMessengerHelpers({
    statelessMessengerRef,
    metadataYdocRef,
    activeYdocResourcesRef,
    currentEditorNoteId,
    currentAwarenessStateRef,
    tempProviderResourcesRef,
    noteIdsWithPendingUpdates,
    setNoteIdsWithPendingUpdates,
  });

  useEffect(() => {
    localStorage.setItem(
      "noteIdsWithPendingUpdates",
      Array.from(noteIdsWithPendingUpdates).join(","),
    );
  }, [noteIdsWithPendingUpdates]);

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

  // After above effect is completed, setup providers if currentUser is defined
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setupCollabProviders();

    window.addEventListener("beforeunload", destroyCollabResources);

    return () => {
      destroyCollabResources();
      window.removeEventListener("beforeunload", destroyCollabResources);
    };
  }, [currentUser]);

  return (
    <StatelessMessengerContext.Provider
      value={{
        statelessMessengerRef,
        metadataYdocRef,
        activeYdocResourcesRef,
        currentAwarenessStateRef,
        tempProviderResourcesRef,
        noteIdsWithPendingUpdates,
        setNoteIdsWithPendingUpdates,
        currentEditorNoteId,
        starredAndMetadataAreReady,
        markNoteAsActive,
        markNoteAsInactive,
        setupTempProvider,
        setupCollabProviders,
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
