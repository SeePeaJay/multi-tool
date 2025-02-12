/*
 * This file defines custom backlink and backlinks section nodes.
 */

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import BacklinksNodeView from "../components/BacklinksNodeView";
import BacklinkNodeView from "../components/BacklinkNodeView";
import { Plugin } from "@tiptap/pm/state";

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

  // block transactions that delete backlinks that are not ready
  // source: https://github.com/ueberdosis/tiptap/issues/181#issuecomment-1833401187
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction(transaction, state) {
          let result = true; // true to keep, false to stop transaction
          const replaceSteps: any[] = [];

          transaction.steps.forEach((step: any, index) => {
            if (step.jsonID === "replace") {
              const nodes = step.slice.content.content;

              if (nodes.length === 1) {
                const node = nodes[0];

                // if it's updating backlink, don't stop transaction
                if (node.type.name === "backlink" && node.attrs.isLoaded) {
                  return;
                }
              }

              replaceSteps.push(index);
            }
          });

          replaceSteps.forEach((index) => {
            const map = transaction.mapping.maps[index] as any;
            const oldStart = map.ranges[0];
            const oldEnd = map.ranges[0] + map.ranges[1];

            state.doc.nodesBetween(oldStart, oldEnd, (node) => {
              if (node.type.name === "backlink" && !node.attrs.isLoaded) {
                result = false;
              }
            });
          });

          return result;
        },
      }),
    ];
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
      isLoaded: {
        // whether we've already tried to fetch the target of this backlink
        default: false,
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
