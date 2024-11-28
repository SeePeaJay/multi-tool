/*
 * This file defines a custom tag node, based on Tiptap's mention.ts.
 */

import { mergeAttributes, Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import NotelinkNodeView from "../components/NotelinkNodeView";
import { NotelinkOptions } from "./notelink";

/**
 * The plugin key for the tag plugin.
 * @default 'tag'
 */
export const TagPluginKey = new PluginKey("tag");

/**
 * This extension allows you to insert tags into the editor.
 */
const Tag = Node.create<NotelinkOptions>({
  name: "tag",

  priority: 101,

  // to be used for functions below
  addOptions() {
    return {
      deleteTriggerWithBackspace: true,
      suggestion: {
        char: "#",
        pluginKey: TagPluginKey,
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
          class: "tag",
        },
        HTMLAttributes,
      ),
      `${this.options.suggestion.char}${node.attrs.targetTitle}`,
    ];
  },

  renderText({ node }) {
    return `${this.options.suggestion.char}${node.attrs.targetTitle}`;
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isTag = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isTag = true;
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

          return isTag;
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
   * Not adding an input rule for now since it causes weird glitches when you type whitespace
   */

  /*
   * This replaces `renderHTML` with a component containing a router link, but doesn't affect the html output
   */
  addNodeView() {
    return ReactNodeViewRenderer(NotelinkNodeView);
  },
});

export default Tag;
