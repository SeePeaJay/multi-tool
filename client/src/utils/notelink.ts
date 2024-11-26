/*
 * This file defines a custom notelink node, based on Tiptap's mention.ts.
 */

import { mergeAttributes, nodeInputRule, Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import NotelinkNodeView from "../components/NotelinkNodeView";

// see `addAttributes` below
export interface NotelinkNodeAttrs {
  /**
   * The target title to be rendered by the editor as the displayed text for this notelink
   * item, if provided. Stored as a `data-target-title` attribute.
   */
  targetTitle: string;

  targetBlockId?: string | null;
}

// define a type for addOptions below
export type NotelinkOptions<
  SuggestionItem = any,
  Attrs extends Record<string, any> = NotelinkNodeAttrs,
> = {
  /**
   * Whether to delete the trigger character with backspace.
   * @default true
   */
  deleteTriggerWithBackspace: boolean;

  /**
   * The suggestion options.
   * @default {}
   * @example { char: '@', pluginKey: NotelinkPluginKey, command: ({ editor, range, props }) => { ... } }
   */
  suggestion: Omit<SuggestionOptions<SuggestionItem, Attrs>, "editor">;
};

/**
 * The plugin key for the notelink plugin.
 * @default 'notelink'
 */
export const NotelinkPluginKey = new PluginKey("notelink");

/**
 * This extension allows you to insert notelinks into the editor.
 */
const Notelink = Node.create<NotelinkOptions>({
  name: "notelink",

  priority: 101,

  // to be used for functions below
  addOptions() {
    return {
      deleteTriggerWithBackspace: true,
      suggestion: {
        char: "[[",
        pluginKey: NotelinkPluginKey,
        command: ({ editor, range, props }) => {
          // increase range.to by one when the next node is of type "text"
          // and starts with a space character
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(" ");

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();

          // get reference to `window` object from editor element, to support cross-frame JS usage
          editor.view.dom.ownerDocument.defaultView
            ?.getSelection()
            ?.collapseToEnd();
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          const allow = !!$from.parent.type.contentMatch.matchType(type);

          return allow;
        },
      },
    };
  },

  group: "inline",

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      type: {
        default: this.name,
        parseHTML: () => this.name,
        renderHTML: () => ({ "data-type": this.name }),
      },
      targetTitle: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-target-title"),
        renderHTML: (attributes) => {
          return {
            "data-target-title": attributes.targetTitle,
          };
        },
      },
      targetBlockId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-target-block-id"),
        renderHTML: (attributes) => {
          if (!attributes.targetBlockId) {
            return {};
          }

          return {
            "data-target-block-id": attributes.targetBlockId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          class: "notelink",
        },
        HTMLAttributes,
      ),
      `[[${node.attrs.targetTitle}${node.attrs.targetBlockId ? `::${node.attrs.targetBlockId}` : ""}]]`,
    ];
  },

  renderText({ node }) {
    return `[[${node.attrs.targetTitle}${node.attrs.targetBlockId ? `::${node.attrs.targetBlockId}` : ""}]]`;
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isNotelink = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isNotelink = true;
              tr.insertText(
                this.options.deleteTriggerWithBackspace
                  ? ""
                  : this.options.suggestion.char || "",
                pos,
                pos + node.nodeSize,
              );

              return false;
            }
          });

          return isNotelink;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },

  /*
   * This captures the link in case the user creates a link by typing `]]`
   */
  addInputRules() {
    return [
      nodeInputRule({
        find: /(\[\[([^\]]+)\]\])$/, // need to capture the whole thing, then a nested one for target title
        type: this.type,
        getAttributes: (match) => ({
          targetTitle: match[2],
        }),
      }),
    ];
  },

  /*
   * This replaces `renderHTML` with a component containing a router link, but doesn't affect the html output
   */
  addNodeView() {
    return ReactNodeViewRenderer(NotelinkNodeView);
  },
});

export default Notelink;
