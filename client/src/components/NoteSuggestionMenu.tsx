/*
 * This file defines defines the actual dropdown menu to be rendered for both notelink and tag suggestion.
 * Based on https://github.com/ueberdosis/tiptap/discussions/2274#discussioncomment-6745835
 */

import { nanoid } from "nanoid";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import { NotelinkNodeAttrs } from "../utils/notelink";

export type NoteSuggestion = {
  suggestionId: string;
  suggestionLabel: string;
  targetTitle: string;
  targetBlockId: string | null;
};

export type NoteSuggestionMenuRef = {
  onKeyDown: NonNullable<
    ReturnType<
      NonNullable<SuggestionOptions<NoteSuggestion>["render"]>
    >["onKeyDown"]
  >;
};

export type NoteSuggestionMenuProps = SuggestionProps<NoteSuggestion>;

const NoteSuggestionMenu = forwardRef<
  NoteSuggestionMenuRef,
  NoteSuggestionMenuProps
>((props, ref) => {
  const authFetch = useAuthFetch();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = async (index: number) => {
    if (index >= props.items.length) {
      /*
       * Make sure we actually have enough items to select the given index.
       * For instance, if a user presses "Enter" when there are no options, the index will
       * be 0 but there won't be any items, so just ignore the callback here
       */
      return;
    }

    const selectedSuggestion = props.items[index];
    const selectedNote = await db.notes.get({ title: selectedSuggestion.targetTitle });
    let notelinkAttrsFromSelection: NotelinkNodeAttrs;

    if (selectedNote) {
      notelinkAttrsFromSelection = {
        targetNoteId: selectedNote!.id,
        targetBlockId: selectedSuggestion.targetBlockId,
      };
    } else {
      const targetNoteId = nanoid(6);

      // then, add a new note entry to dexie
      db.notes.put({
        id: targetNoteId,
        title: selectedSuggestion.targetTitle,
        content: `<div data-title-id="${targetNoteId}"></div><p class="frontmatter"></p><p></p>`,
      });

      // then, sync this update to remote ids.json file
      const notes = await db.notes.toArray();
      const updatedIdObject = notes.reduce(
        (acc, note) => {
          acc[note.id] = note.title;
          return acc;
        },
        {} as { [key: string]: string },
      );
      await authFetch(`/api/ids`, {
        credentials: "include", // required for cookie session to function
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updatedIdObject }),
      });

      // then, create a new note
      await authFetch(`/api/notes/${targetNoteId}`, {
        credentials: "include", // required for cookie session to function
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updatedContent: `<div data-title-id="${targetNoteId}"></div><p class="frontmatter"></p><p></p>`,
        }),
      });

      notelinkAttrsFromSelection = {
        targetNoteId,
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
    <div className="relative flex flex-col gap-0.5 overflow-auto rounded-xl border border-solid border-gray-300 bg-white p-1.5 shadow">
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
