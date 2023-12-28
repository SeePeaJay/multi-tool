import { Node, nodeInputRule } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import CodeBlock from "@tiptap/extension-code-block";
import BlockQuote from "@tiptap/extension-blockquote";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import { Plugin } from "prosemirror-state";
import { nanoid } from "nanoid";
import EngramLinkNodeView from "../components/EngramLinkNodeView.vue";

function getBlockIdForBlockTypeChange(oldBlockIds: string[], newBlockIds: string[]) {
  /* If lengths are different, then current transaction should not change the block type (should create a new block with no content) */
  if (oldBlockIds.length !== newBlockIds.length) {
    return null;
  }

  /* Otherwise, if a block id is missing, then current transaction should ONLY change the block type of ONE single block (and said block id is the one that should be used). I think it's safe to assume this because you can't multi-select in Tiptap to change the type of multiple blocks at once. */
  for (let i = 0; i < oldBlockIds.length; i++) {
    if (oldBlockIds[i] !== newBlockIds[i]) {
      return oldBlockIds[i];
    }
  }

  return null;
}

const BlockType = {
  HEADING: "heading",
  PARAGRAPH: "paragraph",
  BULLETLIST: "bulletList",
  ORDEREDLIST: "orderedList",
  CODEBLOCK: "codeBlock",
  BLOCKQUOTE: "blockquote",
  HORIZONTALRULE: "horizontalRule",
};
const nodeTypesThatShouldHaveBlockId = {
  [BlockType.HEADING]: true,
  [BlockType.PARAGRAPH]: true,
  [BlockType.BULLETLIST]: true,
  [BlockType.ORDEREDLIST]: true,
  [BlockType.CODEBLOCK]: true,
  [BlockType.BLOCKQUOTE]: true,
  [BlockType.HORIZONTALRULE]: true,
};

export const ModifiedStarterKit = StarterKit.configure({
  document: false,
  heading: false,
  paragraph: false,
  bulletList: false,
  orderedList: false,
  codeBlock: false,
  blockquote: false,
  horizontalRule: false,
});

/* Custom node to render block id and create it for new blocks - https://github.com/ueberdosis/tiptap/issues/1041#issuecomment-917610594 */
export const BlockId = Node.create({
  name: "blockId",
  addGlobalAttributes() {
    return [
      {
        types: Object.keys(nodeTypesThatShouldHaveBlockId),
        attributes: {
          blockId: {
            default: null,
            rendered: false,
            keepOnSplit: false,
            /* This bit uses input HTML to store block id as a node attribute https://stackoverflow.com/a/76668447 */
            parseHTML: (element) => {
              return element.hasAttribute("id") ? element.getAttribute("id") : null;
            },
          },
        },
      },
    ];
  },
  /* This snippet generates a unique ID for every new block, even if it results from splitting an existing block in the middle (by default attributes would be copied) - https://discuss.prosemirror.net/t/reset-some-node-attributes-when-split-paragraph/3471/2 */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, oldState, newState) => {
          // no changes
          if (newState.doc === oldState.doc) {
            return;
          }

          const tr = newState.tr;
          const visitedBlockIds: Record<string, boolean> = {};

          const blockIdsBeforeInput = oldState.doc.content.content.map((block: any) => block.attrs.blockId);
          const blockIdsRightAfterInput = newState.doc.content.content.map((block: any) => block.attrs.blockId);
          const blockIdForBlockTypeChange = getBlockIdForBlockTypeChange(blockIdsBeforeInput, blockIdsRightAfterInput);

          newState.doc.descendants((node, pos, parent) => {
            if (node.isBlock) {
              if (
                parent === newState.doc &&
                (!node.attrs.blockId || visitedBlockIds[node.attrs.blockId]) &&
                nodeTypesThatShouldHaveBlockId[node.type.name]
              ) {
                const blockId = blockIdForBlockTypeChange || nanoid(8); // if block id is missing, then it may be due to a change in block type, in which case we just use the same block id before the transaction

                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  blockId,
                });
                visitedBlockIds[blockId] = true;
              } else if (node.attrs.blockId) {
                visitedBlockIds[node.attrs.blockId] = true;
              }
            }
          });

          return tr;
        },
      }),
    ];
  },
});

/* Custom document nodes */
export const TitleDocument = Document.extend({
  content: "heading",
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        this.editor.commands.blur();
        return true;
      },
    };
  },
});
export const BlocksDocument = Document.extend({
  content: "block*",
});

/* Custom block nodes to render id */
export const HeadingWithId = Heading.extend({
  renderHTML({ node }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [`h${level}`, { id: node.attrs.blockId }, 0];
  },
});
export const ParagraphWithId = Paragraph.extend({
  renderHTML({ node }) {
    return ["p", { id: node.attrs.blockId }, 0];
  },
});
export const BulletListWithId = BulletList.extend({
  renderHTML({ node }) {
    return ["ul", { id: node.attrs.blockId }, 0];
  },
});
export const OrderedListWithId = OrderedList.extend({
  renderHTML({ node }) {
    return ["ol", { id: node.attrs.blockId }, 0];
  },
});
export const CodeBlockWithId = CodeBlock.extend({
  renderHTML({ node }) {
    return [
      "pre",
      { id: node.attrs.blockId },
      [
        "code",
        {
          class: node.attrs.language ? this.options.languageClassPrefix + node.attrs.language : null,
        },
        0,
      ],
    ];
  },
});
export const BlockQuoteWithId = BlockQuote.extend({
  renderHTML({ node }) {
    return ["blockquote", { id: node.attrs.blockId }, 0];
  },
});
export const HorizontalRuleWithId = HorizontalRule.extend({
  renderHTML({ node }) {
    return ["hr", { id: node.attrs.blockId }];
  },
});

/* Custom engram link node and autolink */
export const EngramLink = Node.create({
  name: "engramLink",
  group: "inline",
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      isTag: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("istag");
        },
      },
      isAnchor: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("isanchor");
        },
      },
      targetId: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("targetid");
        },
      },
      targetTitle: {
        default: null,
      },
      targetTitleId: {
        default: null,
      },
      anchorContent: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "engram-link",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { targetTitle, targetTitleId, anchorContent, ...renderedAttributes } = HTMLAttributes;

    return ["engram-link", renderedAttributes];
  },
  addNodeView() {
    return VueNodeViewRenderer(EngramLinkNodeView);
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
          const [, , engramLinkMarker, targetTitle] = match;
          return {
            ...(engramLinkMarker === "#" && { isTag: "true" }),
            targetTitle: targetTitle,
          };
        },
      }),
    ];
  },
});
export const AutoLink = Link.extend({ inclusive: false }).configure({
  autolink: true,
});

/* Custom placeholder config */
export const BlockPlaceholder = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "heading") {
      return "What’s the title?";
    }

    return "Can you add some further context?";
  },
});
