/* This file defines a custom note embed node. */

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";

/* Define a type for addOptions below */
interface NoteEmbedOptions {
  suggestion: Omit<SuggestionOptions, "editor">;
  NoteEmbedNodeView?: React.FC<NodeViewProps>;
}

export const noteEmbedNodeName = "noteEmbed";
export const noteEmbedTriggerChar = "[[ ";

const NoteEmbed = Node.create<NoteEmbedOptions>({
  name: noteEmbedNodeName,

  // to be used for functions below
  addOptions() {
    return {
      suggestion: {},
      NoteEmbedNodeView: undefined,
    };
  },

  group: "block",

  addAttributes() {
    return {
      targetNoteId: {
        default: "",
      },
      // technically, the id of the tag contained by the target block
      targetBlockId: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.note-embed",
        getAttrs: (element) => ({
          targetNoteId: element.getAttribute("data-target-note-id"),
          targetBlockId: element.getAttribute("data-target-block-id"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { targetNoteId, targetBlockId } = HTMLAttributes;

    return [
      "div",
      {
        class: "note-embed",
        "data-target-note-id": targetNoteId,
        "data-target-block-id": targetBlockId,
      },
      `$ ${targetNoteId}${targetBlockId ? `::${targetBlockId}` : ""}`,
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },

  addNodeView() {
    if (!this.options.NoteEmbedNodeView) return;

    return ReactNodeViewRenderer(this.options.NoteEmbedNodeView);
  },
});

export default NoteEmbed;
