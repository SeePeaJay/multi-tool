/*
 * This file defines defines the actual dropdown menu to be rendered for both notelink and tag suggestion.
 * Based on https://github.com/ueberdosis/tiptap/discussions/2274#discussioncomment-6745835
 */

import { TiptapCollabProvider } from "@hocuspocus/provider";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { nanoid } from "nanoid";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { getDefaultYdocUpdate } from "shared";
import * as Y from "yjs";
import { db } from "../db";
import { useAuth } from "../contexts/AuthContext";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";
import { NotelinkNodeAttrs } from "shared/tiptap/notelink";
import { setupYdoc } from "../utils/yjs";

export type NoteSuggestion = {
  suggestionId: string;
  suggestionLabel: string;
  targetNoteId: string | null;
  targetBlockId: string | null;
  titleToCreate?: string;
  blockIndexForNewBlockId?: number;
};

export type NoteSuggestionMenuRef = {
  onKeyDown: NonNullable<
    ReturnType<
      NonNullable<SuggestionOptions<NoteSuggestion>["render"]>
    >["onKeyDown"]
  >;
};

export type NoteSuggestionMenuProps = SuggestionProps<NoteSuggestion>;

interface CreateNoteParams {
  newNoteId: string;
  titleToCreate: string;
}

interface InsertBlockIdParams {
  targetNoteId: string;
  newBlockId: string;
  blockIndexForNewBlockId: number;
}

const NoteSuggestionMenu = forwardRef<
  NoteSuggestionMenuRef,
  NoteSuggestionMenuProps
>((props, ref) => {
  const { currentUser } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { statelessMessengerRef, tempYdocResourcesRef } =
    useStatelessMessenger();

  const createNote = async ({ newNoteId, titleToCreate }: CreateNoteParams) => {
    const defaultYdocUpdate = getDefaultYdocUpdate();

    // Add a new note entry to dexie
    await db.notes.put({
      id: newNoteId,
      title: titleToCreate!,
      content: `<p class="frontmatter"></p><p></p>`,
      contentWords: [""],
      ydocArray: Array.from(defaultYdocUpdate),
    });

    // Broadcast to server and other clients
    statelessMessengerRef.current?.sendStateless(
      JSON.stringify({
        type: "create",
        userId: currentUser,
        noteId: newNoteId,
        title: titleToCreate,
        ydocArray: Array.from(defaultYdocUpdate),
        clientId: statelessMessengerRef.current?.document.clientID,
      }),
    );
  };

  const insertBlockId = async ({
    targetNoteId,
    newBlockId,
    blockIndexForNewBlockId,
  }: InsertBlockIdParams) => {
    const ydoc = new Y.Doc();
    await setupYdoc({ noteId: targetNoteId, ydoc });

    // Insert block id into ydoc
    const xmlFragment = ydoc.getXmlFragment("default");
    const targetElement = xmlFragment.toArray()[
      blockIndexForNewBlockId
    ] as Y.XmlElement;
    const space = new Y.XmlText();
    const span = new Y.XmlElement("blockId");
    space.insert(0, " ");
    span.setAttribute("id", newBlockId);
    targetElement.insert(targetElement.length, [space, span]);

    // No need to create a temp provider if there already exists one that will send the temp stateless msg
    if (tempYdocResourcesRef.current[targetNoteId]?.providerWillSendMsg) {
      return;
    }

    // Destroy the old temp provider if it won't send the temp stateless msg
    if (
      tempYdocResourcesRef.current[targetNoteId] &&
      !tempYdocResourcesRef.current[targetNoteId].providerWillSendMsg
    ) {
      tempYdocResourcesRef.current[targetNoteId].provider.destroy();
    }

    // Create the temp provider
    tempYdocResourcesRef.current[targetNoteId] = {
      provider: new TiptapCollabProvider({
        name: `${currentUser}/${targetNoteId}`, // unique document identifier for syncing
        baseUrl: "ws://localhost:5173/collaboration",
        token: "notoken", // your JWT token
        document: ydoc,
        onSynced() {
          statelessMessengerRef.current?.sendStateless(
            JSON.stringify({
              type: "temp",
              noteId: targetNoteId,
              clientId: statelessMessengerRef.current?.document.clientID,
            }),
          );

          tempYdocResourcesRef.current[targetNoteId].provider.destroy();
          delete tempYdocResourcesRef.current[targetNoteId!];
        },
      }),
      providerWillSendMsg: true,
    };
  };

  const selectItem = async (index: number) => {
    if (index >= props.items.length) {
      /*
       * Make sure we actually have enough items to select the given index.
       * For instance, if a user presses "Enter" when there are no options, the index will
       * be 0 but there won't be any items, so just ignore the callback here
       */
      return;
    }

    const {
      targetNoteId,
      titleToCreate,
      targetBlockId,
      blockIndexForNewBlockId,
    } = props.items[index];
    let notelinkAttrsFromSelection: NotelinkNodeAttrs;

    if (targetNoteId && !titleToCreate) {
      let blockId = targetBlockId;

      if (blockIndexForNewBlockId && !targetBlockId) {
        blockId = nanoid(6);

        insertBlockId({
          targetNoteId,
          newBlockId: blockId,
          blockIndexForNewBlockId,
        });
      }

      notelinkAttrsFromSelection = {
        targetNoteId,
        targetBlockId: blockId,
      };
    } else {
      const newNoteId = nanoid(6);

      await createNote({ newNoteId, titleToCreate: titleToCreate! });

      notelinkAttrsFromSelection = {
        targetNoteId: newNoteId,
        targetBlockId: null,
      };
    }

    props.command(notelinkAttrsFromSelection);
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length,
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="suggestion-menu relative flex flex-col gap-0.5 overflow-auto rounded-xl border border-solid border-gray-300 bg-white p-1.5 shadow">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={`flex w-full items-center gap-1 rounded-lg p-1 text-left hover:bg-slate-200 ${index === selectedIndex ? "bg-slate-100" : ""}`}
            key={index}
            onClick={() => selectItem(index)}
          >
            <span dangerouslySetInnerHTML={{ __html: item.suggestionLabel }} />
            {/* this should be ok; content should already be sanitized server-side before being used here */}
          </button>
        ))
      ) : (
        <div className="item">No result</div>
      )}
    </div>
  );
});

NoteSuggestionMenu.displayName = "SuggestionList";

export default NoteSuggestionMenu;
