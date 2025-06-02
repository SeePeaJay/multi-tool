/*
 * This file defines a custom tag node, based on Tiptap's mention.ts.
 */

import { mergeAttributes, Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import { nanoid } from "nanoid";

interface CreateTagParams {
  NotelinkNodeView?: React.FC<NodeViewProps>;
}

interface TagNodeAttrs {
  /**
   * The target id to be rendered by the editor. Stored as a `data-target-note-id` attribute.
   */
  targetNoteId: string;
}

// define a type for addOptions below
type TagOptions<
  SuggestionItem = any,
  Attrs extends Record<string, any> = TagNodeAttrs,
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
 * The plugin key for the tag plugin.
 * @default 'tag'
 */
const TagPluginKey = new PluginKey("tag");

/**
 * This extension allows you to insert tags into the editor.
 */
function Tag({ NotelinkNodeView }: CreateTagParams) {
  return Node.create<TagOptions>({
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
                  attrs: {
                    id: nanoid(6),
                    ...props,
                  },
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
        id: {
          default: "",
          parseHTML: (element) => element.getAttribute("id"),
          renderHTML: (attributes) => ({ id: attributes.id }),
        },
        type: {
          default: this.name,
          parseHTML: () => this.name,
          renderHTML: () => ({ "data-type": this.name }),
        },
        targetNoteId: {
          default: "",
          parseHTML: (element) => element.getAttribute("data-target-note-id"),
          renderHTML: (attributes) => {
            return {
              "data-target-note-id": attributes.targetNoteId,
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ...attributesToRender } = HTMLAttributes;

      return [
        "span",
        mergeAttributes(
          {
            class: "tag",
          },
          attributesToRender,
        ),
        `${this.options.suggestion.char}${node.attrs.targetNoteId}`,
      ];
    },

    renderText({ node }) {
      return `${this.options.suggestion.char}${node.attrs.targetNoteId}`;
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
    ...(NotelinkNodeView && {
      addNodeView() {
        return ReactNodeViewRenderer(NotelinkNodeView);
      },
    }),
  });
}

export default Tag;
