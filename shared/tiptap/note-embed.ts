/*
 * This file defines a custom note embed node.
 */

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";

interface CreateNoteEmbedParams {
  NoteEmbedNodeView?: React.FC<NodeViewProps>;
}

function NoteEmbed({ NoteEmbedNodeView }: CreateNoteEmbedParams) {
  return Node.create({
    name: "noteEmbed",

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

    ...(NoteEmbedNodeView && {
      addNodeView() {
        return ReactNodeViewRenderer(NoteEmbedNodeView);
      },
    }),
  });
}

export default NoteEmbed;
