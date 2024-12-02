import { Node } from "@tiptap/core";

// Define a type for HTML attributes including contenteditable
interface HTMLAttributes {
  class: string;
  contenteditable?: string;
}

/**
 * This extension allows you to create title, copied from ...
 * @see https://www.tiptap.dev/api/nodes/heading
 */
const Title = Node.create({
  name: "title",

  content: "inline*",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (element) => element.textContent,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "h1.title",
      },
    ];
  },

  renderHTML({ node }) {
    const attrs: HTMLAttributes = { class: "title" };

    // don't make title editable if it is "Starred"
    if (node.attrs.title === "Starred") {
      attrs.contenteditable = "false";
    }

    return ["h1", attrs, 0];
  },
});

export default Title;
