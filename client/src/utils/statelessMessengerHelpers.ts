import { HocuspocusProvider, TiptapCollabProvider } from "@hocuspocus/provider";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDefaultMetadataYdocArray, getDefaultYdocUpdate } from "shared";
import * as Y from "yjs";
import { db, turndownService } from "../db";
import { useAuth } from "../contexts/AuthContext";
import { useSession } from "../contexts/SessionContext";
import {
  CurrentAwarenessState,
  StatelessMessengerContextType,
} from "../contexts/StatelessMessengerContext";
import { useAuthFetch } from "../hooks/AuthFetch";
import { setupYdoc } from "../utils/yjs";

/**
 * @param {number} noteId - The id of the note.
 * @param {number} isFromEditor - Whether the caller is the current editor component.
 */
export type MarkNoteAsActiveArgs = {
  noteId: string;
};

/**
 * @param {number} noteId - The id of the note.
 * @param {number} isFromEditor - Whether the caller is the current editor component.
 */
export type MarkNoteAsInactiveArgs = {
  noteId: string;
};

interface SetupMetadataYDocArgs {
  metadataYdoc: Y.Doc;
}

export type SetupTempProviderArgs = {
  noteId: string;
  ydoc: Y.Doc;
  shouldSendMsg?: boolean;
};

type DestroyCollabResourcesForDeletedNoteArgs = {
  noteId: string;
};

export const useStatelessMessengerHelpers = (
  props: Pick<
    StatelessMessengerContextType,
    | "statelessMessengerRef"
    | "metadataYdocRef"
    | "activeYdocResourcesRef"
    | "currentEditorNoteId"
    | "currentAwarenessStateRef"
    | "tempProviderResourcesRef"
    | "noteIdsWithPendingUpdates"
    | "setNoteIdsWithPendingUpdates"
  >,
) => {
  const { currentUser } = useAuth();
  const authFetch = useAuthFetch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnectedToServerRef } = useSession();

  // A copy of location pathname to avoid stale closure below
  const locationPathnameRef = useRef(location.pathname);

  // Marks a note as active (some client's editor is editting the note).
  const markNoteAsActive = ({ noteId }: MarkNoteAsActiveArgs) => {
    // If note isn't marked as active yet, mark it as active, and return ydoc (in case it's for editor)
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

      // console.log(
      //   `marked note ${noteId} as active for the first time: `,
      //   activeYdocResourcesRef.current,
      // );

      return ydoc;
    }

    // Increment count for number of connected clients actively editting the note.
    props.activeYdocResourcesRef.current[noteId].activeClientCount++;

    // console.log(
    //   `incrementing active count for note ${noteId}: `,
    //   activeYdocResourcesRef.current,
    // );

    return props.activeYdocResourcesRef.current[noteId].ydoc;
  };

  const markNoteAsInactive = ({ noteId }: MarkNoteAsInactiveArgs) => {
    // It's possible to call this when resource is already deleted (due to deleting a note), so simply return
    if (!props.activeYdocResourcesRef.current[noteId]) {
      return;
    }

    // Decrement count for number of connected clients actively editting the note.
    props.activeYdocResourcesRef.current[noteId].activeClientCount--;

    // If there are no connected clients editting the note, then we can safely destroy and delete the provider.
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

    // console.log(
    //   `note ${noteId} marked as inactive: `,
    //   activeYdocResourcesRef.current,
    // );
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
            props.statelessMessengerRef?.current?.sendStateless(
              JSON.stringify({
                type: "temp",
                noteId: noteId,
                clientId:
                  props.statelessMessengerRef?.current?.document.clientID,
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

  function setupCollabProviders() {
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
                !props.noteIdsWithPendingUpdates.has(noteId),
            )
            .map((noteId: string) =>
              db.notes.put({
                id: noteId,
                title: noteList[noteId].title,
                content: noteList[noteId].content,
                contentWords: turndownService
                  .turndown(noteList[noteId].content)
                  .split(/\s+/),
                ydocArray: noteList[noteId].ydocArray,
              }),
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
          props.statelessMessengerRef.current?.setAwarenessField(
            "currentNote",
            props.currentEditorNoteId.current,
          );
        }

        // Setup a temp provider for each id in the set
        props.noteIdsWithPendingUpdates.forEach((noteId) => {
          if (noteId !== props.currentEditorNoteId.current) {
            const ydoc = new Y.Doc();

            setupYdoc({ noteId, ydoc });
            setupTempProvider({ noteId, ydoc, shouldSendMsg: true });
          }

          props.setNoteIdsWithPendingUpdates((prevSet) => {
            const newSet = new Set(prevSet);
            newSet.delete(noteId);
            return newSet;
          });
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

        // console.log(
        //   "awareness change: ",
        //   props.currentAwarenessStateRef.current,
        //   updatedAwarenessState,
        // );

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
      // onDisconnect() {
      //   isConnectedToServerRef.current = false;
      // },
    });

    props.statelessMessengerRef.current = metadataProvider;
  }

  function destroyCollabResources() {
    const activeYdocResources = props.activeYdocResourcesRef.current;
    const currentActiveProvider = props.currentEditorNoteId.current
      ? activeYdocResources[props.currentEditorNoteId.current].provider
      : null;

    props.statelessMessengerRef.current?.destroy();
    props.statelessMessengerRef.current = null;

    props.currentAwarenessStateRef.current = {};

    Object.keys(activeYdocResources)
      .filter((noteId) => noteId !== props.currentEditorNoteId.current)
      .forEach((noteId) => {
        activeYdocResources[noteId].provider?.destroy();
        delete activeYdocResources[noteId];
      });

    if (currentActiveProvider) {
      if (currentActiveProvider.hasUnsyncedChanges) {
        props.setNoteIdsWithPendingUpdates((prev) =>
          new Set(prev).add(props.currentEditorNoteId.current),
        );
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
    const tempResourcesToDestroy = props.tempProviderResourcesRef.current[noteId];

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

    props.setNoteIdsWithPendingUpdates((prev) => {
      const newSet = new Set(prev);
      newSet.delete(noteId);
      return newSet;
    });
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
          destroyCollabResourcesForDeletedNote({ noteId: key }); // make sure to destroy all providers before markNoteAsInactive

          db.notes.delete(key);

          if (locationPathnameRef.current === `/app/notes/${key}`) {
            props.currentEditorNoteId.current = "";

            navigate("/app/notes", { replace: true });
          }
        }
      });
    });
  }

  async function ensureStarredExists() {
    const starredExists = await db.notes.get("starred");

    if (!starredExists) {
      await db.notes.put({
        id: "starred", // a fixed id since Starred is unique and this makes it easy to merge two Starred
        title: "Starred",
        content: `<p class="frontmatter"></p><p></p>`,
        contentWords: [""],
        ydocArray: Array.from(getDefaultYdocUpdate()),
      });
    }
  }

  useEffect(() => {
    locationPathnameRef.current = location.pathname;
  }, [location.pathname]);

  return {
    markNoteAsActive,
    markNoteAsInactive,
    setupMetadataYdoc,
    setupTempProvider,
    setupCollabProviders,
    destroyCollabResources,
    destroyCollabResourcesForDeletedNote,
    ensureStarredExists,
  };
};
