/*
 * This file defines a base suggestion config that can be used for both notelink and tag.
 */

import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { db } from "../db";
import NoteSuggestionMenu, {
  NoteSuggestionMenuRef,
  NoteSuggestion,
} from "../components/NoteSuggestionMenu";
import { NotelinkOptions } from "./notelink";

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

export const baseNoteSuggestionConfig: NotelinkOptions["suggestion"] = {
  allowSpaces: true,

  items: async ({ query }): Promise<NoteSuggestion[]> => {
    if (!query) {
      return Promise.resolve([]);
    }

    try {
      const storedList = await db.notes.toArray().then((notes) => notes.map((note) => note.key));

      return Promise.resolve(
        storedList
          .map((name, index) => ({ mentionLabel: name, id: index.toString() }))
          .filter((item) =>
            item.mentionLabel.toLowerCase().startsWith(query.toLowerCase()),
          )
          .slice(0, 5),
      );
    } catch (error) {
      console.error("Failed to fetch note titles:", error);
      return [];
    }
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
};
