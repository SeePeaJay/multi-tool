/*
 * This file defines a custom backlink node.
 */

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";

interface CreateBacklinkParams {
  BacklinkNodeView?: React.FC<NodeViewProps>;
}

function Backlink({ BacklinkNodeView }: CreateBacklinkParams) {
  return Node.create({
    name: "backlink",

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
          tag: "div.backlink",
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
          class: "backlink",
          "data-target-note-id": targetNoteId,
          "data-target-block-id": targetBlockId,
        },
        `$ ${targetNoteId}${targetBlockId ? `::${targetBlockId}` : ""}`,
      ];
    },

    ...(BacklinkNodeView && {
      addNodeView() {
        return ReactNodeViewRenderer(BacklinkNodeView);
      },
    }),
  });
}

export default Backlink;
