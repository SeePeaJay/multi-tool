/*
 * This file defines custom backlink and backlinks section nodes.
 */

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import BacklinksNodeView from "../components/BacklinksNodeView";
import BacklinkNodeView from "../components/BacklinkNodeView";

const Backlinks = Node.create({
  name: "backlinks",

  priority: 101,

  group: "block",

  parseHTML() {
    return [
      {
        tag: "div.backlinks",
      },
    ];
  },

  renderHTML() {
    return ["div", { class: "backlinks" }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BacklinksNodeView);
  },
});

const Backlink = Node.create({
  name: "backlink",

  group: "block",

  addAttributes() {
    return {
      targetNoteId: {
        default: "",
      },
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
      targetBlockId,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BacklinkNodeView);
  },
});

export { Backlinks, Backlink };
