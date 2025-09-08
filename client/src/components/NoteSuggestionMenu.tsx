/*
 * This file defines defines the actual dropdown menu to be rendered for both note reference and tag suggestion.
 * Based on https://github.com/ueberdosis/tiptap/discussions/2274#discussioncomment-6745835
 */

import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { nanoid } from "nanoid";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import * as Y from "yjs";
import { useSession } from "../contexts/SessionContext";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";
import { NoteReferenceNodeAttrs } from "shared/tiptap/note-reference";
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
  const { isConnectedToServerRef } = useSession();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { metadataYdocRef, updatePendingNotes, setupTempProvider } =
    useStatelessMessenger();

  // Add a new note entry to metadata ydoc, which on change will create note
  const createNote = async ({ newNoteId, titleToCreate }: CreateNoteParams) => {
    const noteMetadata = metadataYdocRef.current.getMap("noteMetadata");
    noteMetadata.set(newNoteId, titleToCreate);
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

    if (isConnectedToServerRef.current) {
      setupTempProvider({ noteId: targetNoteId, ydoc, shouldSendMsg: true });
    } else {
      updatePendingNotes("add", targetNoteId);
    }
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
    let selectedNoteReferenceTarget: NoteReferenceNodeAttrs;

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

      selectedNoteReferenceTarget = {
        targetNoteId,
        targetBlockId: blockId,
      };
    } else {
      const newNoteId = nanoid(6);

      await createNote({ newNoteId, titleToCreate: titleToCreate! });

      selectedNoteReferenceTarget = {
        targetNoteId: newNoteId,
        targetBlockId: null,
      };
    }

    props.command(selectedNoteReferenceTarget);
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
