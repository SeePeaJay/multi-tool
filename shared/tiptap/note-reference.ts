/*
 * This file defines a custom note reference node, based on Tiptap's mention.ts.
 */

import { mergeAttributes, Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";

interface CreateNoteReferenceParams {
  NoteReferenceNodeView?: React.FC<NodeViewProps>;
}

export interface NoteReferenceNodeAttrs {
  /**
   * The target id to be rendered by the editor. Stored as a `data-target-note-id` attribute.
   */
  targetNoteId: string;

  targetBlockId?: string | null;
}

// define a type for addOptions below
export type NoteReferenceOptions<
  SuggestionItem = any,
  Attrs extends Record<string, any> = NoteReferenceNodeAttrs,
> = {
  /**
   * Whether to delete the trigger character with backspace.
   * @default true
   */
  deleteTriggerWithBackspace: boolean;

  /**
   * The suggestion options.
   * @default {}
   * @example { char: '@', pluginKey: NoteReferencePluginKey, command: ({ editor, range, props }) => { ... } }
   */
  suggestion: Omit<SuggestionOptions<SuggestionItem, Attrs>, "editor">;
};

/**
 * The plugin key for the note reference plugin.
 * @default 'noteReference'
 */
export const NoteReferencePluginKey = new PluginKey("noteReference");

/**
 * This extension allows you to insert note references into the editor.
 */
function NoteReference({ NoteReferenceNodeView }: CreateNoteReferenceParams) {
  return Node.create<NoteReferenceOptions>({
    name: "noteReference",

    priority: 101,

    // to be used for functions below
    addOptions() {
      return {
        deleteTriggerWithBackspace: true,
        suggestion: {
          char: "[[",
          pluginKey: NoteReferencePluginKey,
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
        targetNoteId: {
          default: "",
          parseHTML: (element) => element.getAttribute("data-target-note-id"),
          renderHTML: (attributes) => {
            return {
              "data-target-note-id": attributes.targetNoteId,
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ...attributesToRender } = HTMLAttributes;

      return [
        "span",
        mergeAttributes(
          {
            class: "note-reference",
          },
          attributesToRender,
        ),
        `[[${node.attrs.targetNoteId}${node.attrs.targetBlockId ? `::${node.attrs.targetBlockId}` : ""}]]`,
      ];
    },

    renderText({ node }) {
      return `[[${node.attrs.targetNoteId}${node.attrs.targetBlockId ? `::${node.attrs.targetBlockId}` : ""}]]`;
    },

    addKeyboardShortcuts() {
      return {
        Backspace: () =>
          this.editor.commands.command(({ tr, state }) => {
            let isNoteReference = false;
            const { selection } = state;
            const { empty, anchor } = selection;

            if (!empty) {
              return false;
            }

            state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
              if (node.type.name === this.name) {
                isNoteReference = true;
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

            return isNoteReference;
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
     * This replaces `renderHTML` with a component containing a router link, but doesn't affect the html output
     */
    ...(NoteReferenceNodeView && {
      addNodeView() {
        return ReactNodeViewRenderer(NoteReferenceNodeView);
      },
    }),
  });
}

export default NoteReference;
