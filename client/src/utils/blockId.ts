import { mergeAttributes, Node } from "@tiptap/core";

/**
 * This extension allows you to insert block ids into the editor.
 */
const BlockId = Node.create({
  name: "blockId",

  priority: 101,

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
      blockIndexForNewBlockId: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span.block-id`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { blockIndexForNewBlockId, ...attributesToRender } = HTMLAttributes;

    return [
      "span",
      mergeAttributes(
        {
          class: "block-id",
        },
        attributesToRender,
      ),
      `::${node.attrs.id}`,
    ];
  },

  renderText({ node }) {
    return `::${node.attrs.id}`;
  },
});

export default BlockId;
