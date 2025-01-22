/*
 * This file defines a custom backlinks node.
 */

import { Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import BacklinksNodeView from "../components/BacklinksNodeView";

// export interface BacklinksNodeAttrs {
//   // /**
//   //  * The target id to be rendered by the editor. Stored as a `data-target-note-id` attribute.
//   //  */
//   // targetNoteId: string;

//   // targetBlockId?: string | null;

//   // initialTargetTitle?: string;

//   // backlinks: string;
// }

// define a type for addOptions below
export type BacklinksOptions<> = {
  authFetch: (url: string, options?: RequestInit) => Promise<string>;
};

/**
 * This extension allows you to insert notelinks into the editor.
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

  parseHTML() {
    return [{ tag: "div.backlinks" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { class: "backlinks", ...HTMLAttributes }];
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
