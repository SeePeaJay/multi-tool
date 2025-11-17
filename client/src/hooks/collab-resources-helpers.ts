import { HocuspocusProvider, TiptapCollabProvider } from "@hocuspocus/provider";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDefaultMetadataYdocArray } from "shared";
import * as Y from "yjs";
import { db, dbCreateNote, turndownService } from "../db";
import { useAuth } from "../contexts/AuthContext";
import { useSession } from "../contexts/SessionContext";
import {
  CurrentAwarenessState,
  CollabResourcesContextType,
} from "../contexts/CollabResourcesContext";
import { useAuthFetch } from "./AuthFetch";
import { setupYdoc } from "../utils/yjs";

export type MarkNoteAsActiveArgs = {
  /* The id of the note. */
  noteId: string;
};

export type MarkNoteAsInactiveArgs = {
  /* The id of the note. */
  noteId: string;
};

interface SetupMetadataYDocArgs {
  metadataYdoc: Y.Doc;
}

type ResolveDuplicateTitleArgs = {
  duplicateTitle: string;
  existingNoteId: string;
  incomingNoteId: string;
  metadataYdoc: Y.Doc;
  TRANSACTION_ORIGIN: string;
};

export type SetupTempProviderArgs = {
  noteId: string;
  ydoc: Y.Doc;
  shouldSendMsg?: boolean;
};

type DestroyCollabResourcesForDeletedNoteArgs = {
  noteId: string;
};

export const useCollabResourcesHelpers = (
  props: Pick<
    CollabResourcesContextType,
    | "metadataProviderRef"
    | "metadataYdocRef"
    | "activeYdocResourcesRef"
    | "currentEditorNoteId"
    | "currentAwarenessStateRef"
    | "tempProviderResourcesRef"
    | "pendingNotesRef"
    | "updatePendingNotes"
  >,
) => {
  const { currentUser } = useAuth();
  const authFetch = useAuthFetch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnectedToServerRef } = useSession();

  /* A copy of location pathname to avoid stale closure below */
  const locationPathnameRef = useRef(location.pathname);

  /* Mark a note as active (some client's editor is editting the note). */
  const markNoteAsActive = ({ noteId }: MarkNoteAsActiveArgs) => {
    /* If note isn't marked as active yet, mark it as active, and return ydoc (in case it's for editor) */
    if (!props.activeYdocResourcesRef.current[noteId]) {
      const ydoc = new Y.Doc();

      setupYdoc({ noteId, ydoc });

      props.activeYdocResourcesRef.current[noteId] = {
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

      return ydoc;
    }

    /* Increment count for number of connected clients actively editting the note. */
    props.activeYdocResourcesRef.current[noteId].activeClientCount++;

    return props.activeYdocResourcesRef.current[noteId].ydoc;
  };

  const markNoteAsInactive = ({ noteId }: MarkNoteAsInactiveArgs) => {
    // It's possible to call this when resource is already deleted (due to deleting a note), so simply return
    if (!props.activeYdocResourcesRef.current[noteId]) return;

    /* Decrement count for number of connected clients actively editting the note. */
    props.activeYdocResourcesRef.current[noteId].activeClientCount--;

    /* If there are no connected clients editting the note, then we can safely destroy and delete the provider. */
    if (props.activeYdocResourcesRef.current[noteId].activeClientCount === 0) {
      if (isConnectedToServerRef.current) {
        setupTempProvider({
          noteId,
          ydoc: props.activeYdocResourcesRef.current[noteId].ydoc,
          shouldSendMsg:
            props.activeYdocResourcesRef.current[noteId].provider
              ?.hasUnsyncedChanges, // still create temp if there is no unsynced; it's possible to create active, then immediately destroy it before it can sync data from server
        });
      }

      props.activeYdocResourcesRef.current[noteId].provider?.destroy();
      delete props.activeYdocResourcesRef.current[noteId];
    }
  };

  function setupTempProvider({
    noteId,
    ydoc,
    shouldSendMsg,
  }: SetupTempProviderArgs) {
    const tempProviderResource = {
      provider: new TiptapCollabProvider({
        name: `${currentUser}/${noteId}`, // unique document identifier for syncing
        baseUrl: "ws://localhost:5173/collaboration",
        token: "notoken",
        document: ydoc,
        onSynced() {
          if (shouldSendMsg) {
            props.metadataProviderRef?.current?.sendStateless(
              JSON.stringify({
                type: "temp",
                noteId: noteId,
                clientId: props.metadataProviderRef?.current?.document.clientID,
              }),
            );
          }

          tempProviderResource.provider.destroy();
          props.tempProviderResourcesRef.current[noteId].delete(
            tempProviderResource,
          );
        },
      }),
      providerWillSendMsg: !!shouldSendMsg,
    };

    (props.tempProviderResourcesRef.current[noteId] ??= new Set()).add(
      tempProviderResource,
    );
  }

  function setupMetadataProvider() {
    const metadataProvider = new HocuspocusProvider({
      name: currentUser,
      url: "ws://localhost:5173/collaboration",
      token: "notoken", // your JWT token
      document: props.metadataYdocRef.current,
      onAuthenticated() {
        isConnectedToServerRef.current = true;
      },
      async onSynced() {
        const noteList = await authFetch(`/api/notes`, {
          credentials: "include",
        });

        // This safeguard makes sure we exit early if onSynced is called during a server disconnect
        if (!noteList) {
          return;
        }

        // Persist data for notes that won't be covered by active/temp providers
        await Promise.all(
          Object.keys(noteList)
            .filter(
              (noteId) =>
                props.currentEditorNoteId.current !== noteId &&
                !props.pendingNotesRef.current.has(noteId),
            )
            .map(
              (noteId: string) =>
                db.notes.update(noteId, {
                  content: noteList[noteId].content,
                  contentWords: turndownService
                    .turndown(noteList[noteId].content)
                    .split(/\s+/),
                  ydocArray: noteList[noteId].ydocArray,
                }), // assume metadata observe would have created the rows already, so we just update here
            ),
        );

        // Setup active provider, if editor hasn't set it up yet
        const activeYdocResource =
          props.activeYdocResourcesRef.current[
            props.currentEditorNoteId.current
          ];
        if (props.currentEditorNoteId.current && !activeYdocResource.provider) {
          activeYdocResource.provider = new TiptapCollabProvider({
            name: `${currentUser}/${props.currentEditorNoteId.current}`, // unique document identifier for syncing
            baseUrl: "ws://localhost:5173/collaboration",
            token: "notoken", // your JWT token
            document: activeYdocResource.ydoc,
          });
          props.metadataProviderRef.current?.setAwarenessField(
            "currentNote",
            props.currentEditorNoteId.current,
          );
        }

        // Setup a temp provider for each id in the set
        props.pendingNotesRef.current.forEach((noteId) => {
          if (noteId !== props.currentEditorNoteId.current) {
            const ydoc = new Y.Doc();

            setupYdoc({ noteId, ydoc });
            setupTempProvider({ noteId, ydoc, shouldSendMsg: true });
          }

          props.updatePendingNotes("delete", noteId);
        }); // if disconnected while loop is running, loop will still complete
      },
      onStateless({ payload }) {
        const msg = JSON.parse(payload);
        const { noteId, clientId } = msg;

        if (clientId === metadataProvider.document.clientID) {
          return;
        }

        if (msg.type === "temp") {
          const ydoc = new Y.Doc();

          setupYdoc({ noteId, ydoc });
          setupTempProvider({ noteId, ydoc });
        }
      },
      onAwarenessChange({ states }) {
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
          ...Object.keys(props.currentAwarenessStateRef.current),
          ...Object.keys(updatedAwarenessState),
        ]);

        for (const clientId of allClientIds) {
          // current editor already marked the note as active; no need to handle it here an extra time
          if (metadataProvider.document.clientID.toString() === clientId) {
            continue;
          }

          const clientIdIsInCurrent = Object.keys(
            props.currentAwarenessStateRef.current,
          ).includes(clientId);
          const clientIdIsInUpdated = Object.keys(
            updatedAwarenessState,
          ).includes(clientId);

          if (!clientIdIsInCurrent && clientIdIsInUpdated) {
            const noteIdToFollow = updatedAwarenessState[clientId];

            markNoteAsActive({ noteId: noteIdToFollow });
          } else if (!clientIdIsInUpdated && clientIdIsInCurrent) {
            const noteIdToUnfollow =
              props.currentAwarenessStateRef.current[clientId];

            markNoteAsInactive({ noteId: noteIdToUnfollow });
          }
        }

        props.currentAwarenessStateRef.current = updatedAwarenessState;
      },
      onDisconnect() {
        isConnectedToServerRef.current = false;

        processTempProvidersOnDisconnect();
      },
    });

    props.metadataProviderRef.current = metadataProvider;
  }

  /* Convert existing temp providers to noteIdsWithPendingUpdate if they should send stateless */
  function processTempProvidersOnDisconnect() {
    for (const [noteId, set] of Object.entries(
      props.tempProviderResourcesRef.current,
    )) {
      for (const { provider, providerWillSendMsg } of set) {
        if (providerWillSendMsg) {
          props.updatePendingNotes("add", noteId);
        }

        provider.destroy();
      }
    }

    props.tempProviderResourcesRef.current = {};
  }

  function destroyCollabResources() {
    const activeYdocResources = props.activeYdocResourcesRef.current;
    const currentActiveProvider = props.currentEditorNoteId.current
      ? activeYdocResources[props.currentEditorNoteId.current].provider
      : null;

    props.metadataProviderRef.current?.destroy();
    props.metadataProviderRef.current = null;

    props.currentAwarenessStateRef.current = {};

    Object.keys(activeYdocResources)
      .filter((noteId) => noteId !== props.currentEditorNoteId.current)
      .forEach((noteId) => {
        activeYdocResources[noteId].provider?.destroy();
        delete activeYdocResources[noteId];
      });

    if (currentActiveProvider) {
      if (currentActiveProvider.hasUnsyncedChanges) {
        props.updatePendingNotes("add", props.currentEditorNoteId.current);
      }

      currentActiveProvider.destroy();
      activeYdocResources[props.currentEditorNoteId.current].provider = null;
    }
  }

  function destroyCollabResourcesForDeletedNote({
    noteId,
  }: DestroyCollabResourcesForDeletedNoteArgs) {
    const activeYdocResources = props.activeYdocResourcesRef.current;

    const activeResourceToDestroy = activeYdocResources[noteId];
    const tempResourcesToDestroy =
      props.tempProviderResourcesRef.current[noteId];

    if (activeResourceToDestroy) {
      activeResourceToDestroy.provider?.destroy(); // destroy if online
      delete activeYdocResources[noteId];
    } // delete if on page

    if (tempResourcesToDestroy) {
      tempResourcesToDestroy.forEach((resource) => {
        resource.provider.destroy();
      });
      delete props.tempProviderResourcesRef.current[noteId];
    }

    props.updatePendingNotes("delete", noteId);
  }

  async function setupMetadataYdoc({ metadataYdoc }: SetupMetadataYDocArgs) {
    let ydocArray = (await db.user.get(0))?.metadataYdocArray;

    if (!ydocArray) {
      ydocArray = Array.from(getDefaultMetadataYdocArray());

      await db.user.put({
        id: 0,
        metadataYdocArray: ydocArray,
      });
    }

    Y.applyUpdate(metadataYdoc, new Uint8Array(ydocArray));

    /* Setup persistence */
    metadataYdoc.on("update", () => {
      db.user.update(0, {
        metadataYdocArray: Array.from(Y.encodeStateAsUpdate(metadataYdoc)),
      });
    });

    const ymap = metadataYdoc.getMap("noteMetadata");
    const FIX_DUPLICATE_TITLE_ORIGIN = "metadata-autofix";

    /* If duplicate titles detected, resolve them first */
    if (ymap.size > new Set(ymap.values()).size) {
      const titleToKeys = getTitleToKeys(ymap);

      for (const [title, keys] of titleToKeys.entries()) {
        while (keys.length > 1) {
          await resolveDuplicateTitle({
            duplicateTitle: title,
            existingNoteId: keys[0],
            incomingNoteId: keys[1],
            metadataYdoc,
            TRANSACTION_ORIGIN: FIX_DUPLICATE_TITLE_ORIGIN,
          });

          keys.splice(keys[0] > keys[1] ? 0 : 1, 1);
        }
      }
    }

    ymap.observe((event, tr) => {
      if (tr?.origin === FIX_DUPLICATE_TITLE_ORIGIN) {
        return;
      }

      for (const [key, change] of event.changes.keys) {
        if (change.action === "add") {
          const incomingTitle = ymap.get(key) as string;

          if (ymap.size > new Set(ymap.values()).size) {
            const titleToKeys = getTitleToKeys(ymap);
            const existingNoteId = (
              titleToKeys.get(incomingTitle) as string[]
            ).filter((id) => id !== key)[0];

            resolveDuplicateTitle({
              duplicateTitle: incomingTitle,
              existingNoteId,
              incomingNoteId: key,
              metadataYdoc,
              TRANSACTION_ORIGIN: FIX_DUPLICATE_TITLE_ORIGIN,
            });
          } else {
            dbCreateNote({
              id: key,
              title: incomingTitle,
            });
          }
        } else if (change.action === "update") {
          db.notes.update(key, { title: ymap.get(key) as string });
        } else {
          destroyCollabResourcesForDeletedNote({ noteId: key }); // make sure to destroy all providers before markNoteAsInactive

          db.notes.delete(key);

          if (locationPathnameRef.current === `/app/notes/${key}`) {
            props.currentEditorNoteId.current = "";

            navigate("/app/notes", { replace: true });
          }
        }
      }
    });
  }

  async function ensureStarredExists() {
    const starredExists = await db.notes.get("starred");

    if (!starredExists) {
      await dbCreateNote({ id: "starred", title: "Starred" }); // a fixed id since Starred is unique and this makes it easy to merge two Starred
    }
  }

  const resolveDuplicateTitle = async ({
    duplicateTitle,
    existingNoteId,
    incomingNoteId,
    metadataYdoc,
    TRANSACTION_ORIGIN,
  }: ResolveDuplicateTitleArgs) => {
    const getUniqueTitle = (title: string, existingTitles: Set<string>) => {
      if (!existingTitles.has(title)) {
        return title;
      }

      let counter = 1;
      let candidate: string;

      do {
        candidate = `${title} (${counter})`;
        counter++;
      } while (existingTitles.has(candidate));

      return candidate;
    };

    const ymap = metadataYdoc.getMap("noteMetadata");
    const allNoteTitles = new Set(ymap.values()) as Set<string>;
    const uniqueTitle = getUniqueTitle(duplicateTitle, allNoteTitles);

    if (existingNoteId > incomingNoteId) {
      /* Rename existing note */

      metadataYdoc.transact(() => {
        ymap.set(existingNoteId, uniqueTitle);
      }, TRANSACTION_ORIGIN);

      await db.notes.update(existingNoteId, {
        title: uniqueTitle,
      }); // has to await to ensure below db call doesn't run in uniqueness error
    } else {
      /* Rename incoming note in ydoc before continuing to next part */
      metadataYdoc.transact(() => {
        ymap.set(incomingNoteId, uniqueTitle);
      }, TRANSACTION_ORIGIN);
    }

    dbCreateNote({
      id: incomingNoteId,
      title: existingNoteId > incomingNoteId ? duplicateTitle : uniqueTitle,
    });
  };

  const getTitleToKeys = (ymap: Y.Map<unknown>) => {
    const titleToKeys = new Map();

    ymap.forEach((value, key) => {
      if (!titleToKeys.has(value)) {
        titleToKeys.set(value, []);
      }
      titleToKeys.get(value).push(key);
    });

    return titleToKeys;
  };

  useEffect(() => {
    locationPathnameRef.current = location.pathname;
  }, [location.pathname]);

  return {
    markNoteAsActive,
    markNoteAsInactive,
    setupMetadataYdoc,
    setupTempProvider,
    setupMetadataProvider,
    destroyCollabResources,
    destroyCollabResourcesForDeletedNote,
    ensureStarredExists,
  };
};
