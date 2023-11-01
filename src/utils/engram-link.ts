import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";

export const EngramLink = Node.create({
  name: "engramLink",
  group: "inline",
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      target: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-target");
        },
        renderHTML: (attributes) => {
          return {
            "data-target": attributes.target,
          };
        },
      },
      isTag: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-is-tag");
        },
        renderHTML: (attributes) => {
          return {
            "data-is-tag": attributes.isTag,
          };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span.engram-link",
        getAttrs: (node) => {
          const element = node as HTMLElement;

          return {
            target: element.getAttribute("data-target"),
            isTag: element.getAttribute("data-is-tag"),
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    if (HTMLAttributes["data-is-tag"] !== null) {
      return ["span", mergeAttributes(HTMLAttributes, { class: "engram-link" }), `#${HTMLAttributes["data-target"]}`];
    }

    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "engram-link btn btn-sm normal-case" }),
      ["i", { class: "pi pi-file" }],
      HTMLAttributes["data-target"],
    ];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: /(([#*])([^{#*\n]+){[^}\n]*})/,
        /*
         * You must have a capture group that includes everything to avoid inserting the engram link span at the wrong position.
         * You can't just have a capture group for the engram link target, as otherwise remaining characters don't get transformed.
         * But you can have a capture group for the engram link target within another capture group.
         * This setup prevents engram links from clipping into other elements and creating a new block for no reason (the latter happens when the engram link is the only element in the block).
         */
        type: this.type,
        getAttributes: (match) => {
          const [, , engramLinkMarker, target] = match;
          return {
            ...(engramLinkMarker === "#" && { isTag: "" }),
            target: target,
          };
        },
      }),
    ];
  },
});
