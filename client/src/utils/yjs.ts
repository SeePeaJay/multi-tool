import { HocuspocusProvider, TiptapCollabProvider } from "@hocuspocus/provider";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateHTML } from "@tiptap/core";
import sanitizeHtml from "sanitize-html";
import {
  createContentEditorExtensions,
  getDefaultMetadataYdocArray,
  getDefaultYdocUpdate,
} from "shared";
import * as Y from "yjs";
import { db, turndownService } from "../db";
import { NavigateFunction } from "react-router-dom";
import {
  // ActiveYdocResources,
  CurrentAwarenessState,
  TempYdocResources,
  MarkNoteAsActiveFn,
  MarkNoteAsInactiveFn,
} from "../contexts/StatelessMessengerContext";

interface InitializeYDocArgs {
  noteId: string;
  ydoc: Y.Doc;
}
interface SetupMetadataYDocArgs {
  metadataYdoc: Y.Doc;
  locationPathnameRef: React.MutableRefObject<string>;
  navigate: NavigateFunction;
}
interface GetMetadataProviderArgs {
  currentUser: string;
  // statelessMessengerRef: React.MutableRefObject<HocuspocusProvider | null>;
  metadataYdocRef: React.MutableRefObject<Y.Doc>;
  // activeYdocResourcesRef: React.MutableRefObject<ActiveYdocResources>;
  // currentEditorNoteId: React.MutableRefObject<string>;
  currentAwarenessStateRef: React.MutableRefObject<CurrentAwarenessState>;
  tempYdocResourcesRef: React.MutableRefObject<TempYdocResources>;
  // noteIdsWithPendingUpdatesRef: React.MutableRefObject<Set<string>>;
  // isConnectedToServerRef: React.MutableRefObject<boolean>;
  markNoteAsActive: MarkNoteAsActiveFn;
  markNoteAsInactive: MarkNoteAsInactiveFn;
}
interface SetupTempProviderArgs {
  currentUser: string;
  noteId: string;
  ydoc: Y.Doc;
  statelessMessengerRef?: React.MutableRefObject<HocuspocusProvider | null>;
  tempYdocResourcesRef: React.MutableRefObject<TempYdocResources>;
}

function getHtmlFromYdoc({ ydoc }: { ydoc: Y.Doc }) {
  const editorExtensions = createContentEditorExtensions();
  const json = TiptapTransformer.fromYdoc(
    ydoc,
    "default", // The field used in Tiptap
  );
  const html = generateHTML(json, editorExtensions);
  const sanitizedHtml = sanitizeHtml(html, {
    allowedAttributes: {
      "*": [
        "id",
        "class",
        "data-type",
        "data-target-note-id",
        "data-target-block-id",
      ],
    },
  });

  return sanitizedHtml;
}

async function setupYdoc({ noteId, ydoc }: InitializeYDocArgs) {
  // hydrate from persisted state if available
  const ydocArray = (await db.notes.get(noteId))?.ydocArray;

  if (ydocArray) {
    Y.applyUpdate(ydoc, new Uint8Array(ydocArray));

    // console.log("init ydoc for: ", noteId);
  } else {
    console.warn(`No state found for note ID: ${noteId}`);
  }

  // set up persistence: save updates to IndexedDB
  ydoc.on("update", () => {
    const html = getHtmlFromYdoc({ ydoc });

    db.notes.update(noteId, {
      ydocArray: Array.from(Y.encodeStateAsUpdate(ydoc)),
      content: html,
      contentWords: turndownService.turndown(html).split(/\s+/),
    });

    // console.log("persisted: ", noteId, getHtmlFromYdoc({ ydoc }));
  });
}

async function setupMetadataYdoc({
  metadataYdoc,
  locationPathnameRef,
  navigate,
}: SetupMetadataYDocArgs) {
  let ydocArray = (await db.user.get(0))?.metadataYdocArray;

  if (!ydocArray) {
    ydocArray = Array.from(getDefaultMetadataYdocArray());

    await db.user.put({
      id: 0,
      metadataYdocArray: ydocArray,
    });
  }

  Y.applyUpdate(metadataYdoc, new Uint8Array(ydocArray));

  // set up persistence
  metadataYdoc.on("update", () => {
    db.user.update(0, {
      metadataYdocArray: Array.from(Y.encodeStateAsUpdate(metadataYdoc)),
    });
  });

  const ymap = metadataYdoc.getMap("noteMetadata");
  ymap.observe((event) => {
    event.changes.keys.forEach((change, key) => {
      if (change.action === "add") {
        db.notes.put({
          id: key,
          title: ymap.get(key) as string,
          content: `<p class="frontmatter"></p><p></p>`,
          contentWords: [""],
          ydocArray: Array.from(getDefaultYdocUpdate()),
        });
      } else if (change.action === "update") {
        db.notes.update(key, { title: ymap.get(key) as string });
      } else {
        db.notes.delete(key);

        if (locationPathnameRef.current === `/app/notes/${key}`) {
          navigate("/app/notes", { replace: true });
        }
      }
    });
  });
}

function setupTempProvider({
  currentUser,
  noteId,
  ydoc,
  statelessMessengerRef,
  tempYdocResourcesRef,
}: SetupTempProviderArgs) {
  const tempProvider = new TiptapCollabProvider({
    name: `${currentUser}/${noteId}`, // unique document identifier for syncing
    baseUrl: "ws://localhost:5173/collaboration",
    token: "notoken",
    document: ydoc,
    onSynced() {
      statelessMessengerRef?.current?.sendStateless(
        JSON.stringify({
          type: "temp",
          noteId: noteId,
          clientId: statelessMessengerRef?.current?.document.clientID,
        }),
      );

      tempProvider.destroy();
      tempYdocResourcesRef.current[noteId].delete(tempProvider);
    },
  });

  (tempYdocResourcesRef.current[noteId] ??= new Set()).add(tempProvider);
}

function getMetadataProvider({
  currentUser,
  // statelessMessengerRef,
  metadataYdocRef,
  // activeYdocResourcesRef,
  // currentEditorNoteId,
  currentAwarenessStateRef,
  tempYdocResourcesRef,
  // noteIdsWithPendingUpdatesRef,
  // isConnectedToServerRef,
  markNoteAsActive,
  markNoteAsInactive,
}: GetMetadataProviderArgs) {
  const statelessMessenger = new HocuspocusProvider({
    name: currentUser,
    url: "ws://localhost:5173/collaboration",
    token: "notoken", // your JWT token
    document: metadataYdocRef.current,
    // onAuthenticated() {
    //   isConnectedToServerRef.current = true;
    // },
    // onSynced() {
    //   //
    //   // if (currentEditorNoteId.current) {
    //   //   activeYdocResourcesRef.current[
    //   //     currentEditorNoteId.current
    //   //   ].provider.connect();
    //   // }

    //   // if disconnected, that will still run after this loop
    //   noteIdsWithPendingUpdatesRef.current.forEach((noteId) => {
    //     const ydoc = new Y.Doc();
    //     setupYdoc({ noteId, ydoc });

    //     console.log("no teemp");

    //     setupTempProvider({
    //       currentUser,
    //       noteId,
    //       ydoc,
    //       statelessMessengerRef,
    //       tempYdocResourcesRef,
    //     });

    //     noteIdsWithPendingUpdatesRef.current.delete(noteId);
    //   });
    // },
    onStateless: ({ payload }) => {
      const msg = JSON.parse(payload);
      const { noteId, clientId } = msg;

      if (clientId === statelessMessenger.document.clientID) {
        return;
      }

      if (msg.type === "temp") {
        const ydoc = new Y.Doc();
        setupYdoc({ noteId, ydoc });

        setupTempProvider({
          currentUser,
          noteId,
          ydoc,
          tempYdocResourcesRef,
        });
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
        const clientIdIsInUpdated = Object.keys(updatedAwarenessState).includes(
          clientId,
        );

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
    // onDisconnect() {
    //   isConnectedToServerRef.current = false;
    // },
  });

  return statelessMessenger;
}

export { setupYdoc, setupMetadataYdoc, setupTempProvider, getMetadataProvider };
