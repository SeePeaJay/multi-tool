/*
 * This file defines a custom note reference node, based on Tiptap's mention.ts.
 */

import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";

export interface NoteReferenceNodeAttrs {
  /**
   * The target id to be rendered by the editor. Stored as a `data-target-note-id` attribute.
   */
  targetNoteId: string;

  targetBlockId?: string | null;
}

// define a type for addOptions below
export type NoteReferenceOptions = {
  /**
   * Whether to delete the trigger character with backspace.
   * @default true
   */
  deleteTriggerWithBackspace: boolean;

  suggestion: Omit<SuggestionOptions, "editor">;

  NoteReferenceNodeView?: React.FC<NodeViewProps>;
};

export const noteReferenceNodeName = "noteReference";
export const noteReferenceTriggerChar = "[[";

/**
 * This extension allows you to insert note references into the editor.
 */
const NoteReference = Node.create<NoteReferenceOptions>({
  name: noteReferenceNodeName,

  priority: 101,

  // to be used for functions below
  addOptions() {
    return {
      deleteTriggerWithBackspace: true,
      suggestion: {},
      NoteReferenceNodeView: undefined,
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
                  : noteReferenceTriggerChar || "",
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
  addNodeView() {
    if (!this.options.NoteReferenceNodeView) return;

    return ReactNodeViewRenderer(this.options.NoteReferenceNodeView);
  },
});

export default NoteReference;
