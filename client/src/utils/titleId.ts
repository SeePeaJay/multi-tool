/**
 * This file defines a custom title id node.
 */

import { Node } from "@tiptap/core";

const TitleId = Node.create({
  name: "titleId",

  group: "titleId",

  addAttributes() {
    return {
      titleId: {
        default: "",
        parseHTML: element => element.getAttribute('data-title-id'),
        renderHTML: (attributes) => {
          return {
            "data-title-id": attributes.titleId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-title-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes }];
  },
});

export default TitleId;
