/* This file defines a custom frontmatter node. */

import { Node } from "@tiptap/core";

const Frontmatter = Node.create({
  name: "frontmatter",

  group: "frontmatter",

  content: "inline*",

  parseHTML() {
    return [
      {
        tag: 'p.frontmatter',
      },
    ];
  },

  renderHTML() {
    return ['p', { class: "frontmatter" }, 0]; // 0 makes it editable
  },
});

export default Frontmatter;
