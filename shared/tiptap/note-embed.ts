/* This file defines a custom note embed node. */

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";

interface NoteEmbedArgs {
  NoteEmbedNodeView?: React.FC<NodeViewProps>;
}

/* Define a type for addOptions below */
interface NoteEmbedOptions {
  suggestion: Omit<SuggestionOptions, "editor">;
}

export const noteEmbedNodeName = "noteEmbed";
export const noteEmbedTriggerChar = "[[ ";

function NoteEmbed({ NoteEmbedNodeView }: NoteEmbedArgs) {
  return Node.create<NoteEmbedOptions>({
    name: noteEmbedNodeName,

    // to be used for functions below
    addOptions() {
      return {
        suggestion: {},
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

    ...(NoteEmbedNodeView && {
      addNodeView() {
        return ReactNodeViewRenderer(NoteEmbedNodeView);
      },
    }),
  });
}

export default NoteEmbed;
