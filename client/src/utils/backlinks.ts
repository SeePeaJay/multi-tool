/*
 * This file defines a custom backlinks node.
 */

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import BacklinksNodeView from "../components/BacklinksNodeView";

// define a type for addOptions below
export type BacklinksOptions<> = {
  authFetch: (url: string, options?: RequestInit) => Promise<string>;
};

/**
 * This extension allows you to insert backlinks into the editor.
 */
const Backlinks = Node.create<BacklinksOptions>({
  name: "backlinks",

  priority: 101,

  addOptions() {
    return {
      authFetch: () => Promise.resolve(""),
    };
  },

  group: "backlinks",

  addAttributes() {
    return {
      backlinks: {
        default: {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.backlinks",
        getAttrs: (element) => {
          const backlinks: Record<string, string[]> = {};

          element.querySelectorAll(".backlinkList").forEach((list) => {
            const targetId = list.getAttribute("data-target-note-id");
            const blockIds = Array.from(list.querySelectorAll(".backlink"))
              .map((block) => block.getAttribute("data-target-block-id"))
              .filter((id): id is string => id !== null);

            if (targetId) {
              backlinks[targetId] = blockIds;
            }
          });
          return { backlinks };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const backlinks: Record<string, string[]> = node.attrs.backlinks;

    // generate child elements for each backlink
    const children = Object.entries(backlinks).map(([targetId, blockIds]) => [
      "div",
      { class: "backlinkList", "data-target-note-id": targetId },
      ...blockIds.map((blockId) => [
        "div",
        { class: "backlink", "data-target-block-id": blockId },
      ]),
    ]);

    return ["div", { class: "backlinks" }, ...children];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BacklinksNodeView);
  },
});

// const BacklinkList = Node.create({
//   name: "backlinkList",

//   group: "block", // list?

//   content: "backlink*",

//   addAttributes() {
//     return {
//       titleId: {
//         default: "",
//         parseHTML: (element) => element.getAttribute("data-title-id"),
//         renderHTML: (attributes) => {
//           return {
//             "data-title-id": attributes.titleId,
//           };
//         },
//       },
//     };
//   },

//   parseHTML() {
//     return [{ tag: "div.backlink-list" }];
//   },

//   renderHTML({ HTMLAttributes }) {
//     return ["div", { class: "div.backlink-list", ...HTMLAttributes }, 0];
//   },
// });

// const Backlink = Node.create({
//   name: 'backlink',

//   group: 'block',

//   addAttributes() {
//     return {
//       targetBlockId: {
//         default: "",
//         parseHTML: (element) => element.getAttribute("data-target-block-id"),
//         renderHTML: (attributes) => {
//           return {
//             "data-target-block-id": attributes.targetBlockId,
//           };
//         },
//       },
//     };
//   },

//   parseHTML() {
//     return [{ tag: 'div.backlink' }];
//   },

//   renderHTML({ HTMLAttributes }) {
//     return ['div', { class: 'backlink', ...HTMLAttributes }];
//   },
// });

export default Backlinks;
