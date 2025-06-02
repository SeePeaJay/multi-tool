/*
 * This file defines a shared suggestion config for both notelink and tag.
 */

import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { db } from "../db";
import NoteSuggestionMenu, {
  NoteSuggestionMenuRef,
  NoteSuggestion,
} from "../components/NoteSuggestionMenu";
import { NotelinkOptions } from "shared/tiptap/notelink";

const parser = new DOMParser();
const DOM_RECT_FALLBACK: DOMRect = {
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON() {
    return {};
  },
};

async function getBlockSuggestionItems(
  cachedNote: { id: string; title: string; content: string },
  blockQuery: string,
): Promise<NoteSuggestion[]> {
  // convert into list of blocks
  const document = parser.parseFromString(cachedNote.content, "text/html");
  const elements = Array.from(document.body.children);
  const storedBlocks = elements.map((element) => element.outerHTML);

  return Promise.resolve(
    storedBlocks
      .map((block, index) => {
        const blockId =
          parser
            .parseFromString(block, "text/html")
            .querySelector("span.block-id")
            ?.getAttribute("id") || null;
        const blockIdDoesntExist = !blockId;

        return {
          suggestionId: index.toString(),
          suggestionLabel: block,
          targetNoteId: cachedNote.id,
          targetBlockId: blockId,
          ...(blockIdDoesntExist && { blockIndexForNewBlockId: index }),
        };
      })
      .filter((item) =>
        item.suggestionLabel.toLowerCase().includes(blockQuery.toLowerCase()),
      ),
  );
}

async function getTitleSuggestionItems(
  titleQuery: string,
): Promise<NoteSuggestion[]> {
  try {
    const cachedNotes = await db.notes.toArray();
    const suggestions: NoteSuggestion[] = cachedNotes
      .map((note, index) => ({
        suggestionId: index.toString(),
        suggestionLabel: note.title,
        targetNoteId: note.id,
        targetBlockId: null,
      }))
      .filter((item) =>
        item.suggestionLabel.toLowerCase().startsWith(titleQuery.toLowerCase()),
      );
    const hasExactMatch = suggestions.some(
      (item) => item.suggestionLabel.toLowerCase() === titleQuery.toLowerCase(),
    );

    if (!hasExactMatch) {
      suggestions.unshift({
        suggestionId: "-1",
        suggestionLabel: `Create "${titleQuery}"`,
        targetNoteId: null,
        targetBlockId: null,
        titleToCreate: titleQuery,
      });
    }

    return Promise.resolve(suggestions);
  } catch (error) {
    console.error("Failed to fetch note titles:", error);
    return [];
  }
}

export const createBaseNoteSuggestionConfig =
  (): NotelinkOptions["suggestion"] => ({
    allowSpaces: true,

    items: async ({ query }): Promise<NoteSuggestion[]> => {
      if (!query) {
        return Promise.resolve([]);
      }

      const [titleQuery, blockQuery] = query.split("::");
      const cachedNote = await db.table("notes").get({ title: titleQuery });

      // if title has exact match and blockquery exists
      if (cachedNote && blockQuery !== undefined) {
        return getBlockSuggestionItems(cachedNote, blockQuery);
      }

      // otherwise, perform standard title search
      return getTitleSuggestionItems(titleQuery);
    },

    render: () => {
      let component: ReactRenderer<NoteSuggestionMenuRef> | undefined;
      let popup: TippyInstance | undefined;

      return {
        onStart: (props) => {
          component = new ReactRenderer(NoteSuggestionMenu, {
            props,
            editor: props.editor,
          });

          popup = tippy("body", {
            getReferenceClientRect: () =>
              props.clientRect?.() ?? DOM_RECT_FALLBACK,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          })[0];
        },

        onUpdate(props) {
          component?.updateProps(props);

          popup?.setProps({
            getReferenceClientRect: () =>
              props.clientRect?.() ?? DOM_RECT_FALLBACK,
          });
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup?.hide();
            return true;
          }

          if (!component?.ref) {
            return false;
          }

          return component.ref.onKeyDown(props);
        },

        onExit() {
          popup?.destroy();
          component?.destroy();

          // Remove references to the old popup and component upon destruction/exit.
          // (This should prevent redundant calls to `popup.destroy()`, which Tippy
          // warns in the console is a sign of a memory leak, as the `suggestion`
          // plugin seems to call `onExit` both when a suggestion menu is closed after
          // a user chooses an option, *and* when the editor itself is destroyed.)
          popup = undefined;
          component = undefined;
        },
      };
    },
  });
