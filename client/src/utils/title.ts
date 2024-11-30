import { Node } from "@tiptap/core";

/**
 * This extension allows you to create title, copied from ...
 * @see https://www.tiptap.dev/api/nodes/heading
 */
const Title = Node.create({
  name: "title",

  content: "inline*",

  group: "block",

  defining: true,

  parseHTML() {
    return [
      {
        tag: "h1.title",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['h1', { ...HTMLAttributes, class: 'title', contenteditable: 'false' }, 0];
  },
});

export default Title;
