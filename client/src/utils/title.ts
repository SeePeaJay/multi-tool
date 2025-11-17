import { Node } from "@tiptap/core";

interface HTMLAttributes {
  class: string;
  contenteditable?: string;
}

/* This extension creates a title, based on https://www.tiptap.dev/api/nodes/heading */
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

    /* Don't make title editable if it is "Starred" */
    if (node.attrs.title === "Starred") {
      attrs.contenteditable = "false";
    }

    return ["h1", attrs, 0];
  },
});

export default Title;
