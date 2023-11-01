<script setup lang="ts">
import { Node } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/vue-3";
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
import { Plugin } from "prosemirror-state";
import { nanoid } from "nanoid";
import { useEditorStore } from "@/stores/editor";
import { EngramLink } from "@/utils/engram-link";

const editorStore = useEditorStore();

/* Create custom node to render block id and create it for new blocks - https://github.com/ueberdosis/tiptap/issues/1041#issuecomment-917610594 */
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
const BlockId = Node.create({
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
          let visitedBlockIds: Record<string, boolean> = {};

          newState.doc.descendants((node, pos, parent) => {
            if (
              node.isBlock &&
              parent === newState.doc &&
              (!node.attrs.blockId || visitedBlockIds[node.attrs.blockId]) &&
              nodeTypesThatShouldHaveBlockId[node.type.name]
            ) {
              const newBlockId = nanoid(8);
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: newBlockId,
              });

              visitedBlockIds[newBlockId] = true;
            } else if (node.isBlock && node.attrs.blockId) {
              visitedBlockIds[node.attrs.blockId] = true;
            }
          });

          return tr;
        },
      }),
    ];
  },
});

/* Custom document to force title */
const CustomDocument = Document.extend({
  content: "heading block*",
});

/* Custom block nodes to render id */
const CustomHeading = Heading.extend({
  renderHTML({ node }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [`h${level}`, { id: node.attrs.blockId }, 0];
  },
});
const CustomParagraph = Paragraph.extend({
  renderHTML({ node }) {
    return ["p", { id: node.attrs.blockId }, 0];
  },
});
const CustomBulletList = BulletList.extend({
  renderHTML({ node }) {
    return ["ul", { id: node.attrs.blockId }, 0];
  },
});
const CustomOrderedList = OrderedList.extend({
  renderHTML({ node }) {
    return ["ol", { id: node.attrs.blockId }, 0];
  },
});
const CustomCodeBlock = CodeBlock.extend({
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
const CustomBlockQuote = BlockQuote.extend({
  renderHTML({ node }) {
    return ["blockquote", { id: node.attrs.blockId }, 0];
  },
});
const CustomHorizontalRule = HorizontalRule.extend({
  renderHTML({ node }) {
    return ["hr", { id: node.attrs.blockId }];
  },
});

/* Editor setup */
const editor = useEditor({
  content: editorStore.blocksInHtml,
  extensions: [
    StarterKit.configure({
      document: false,
      heading: false,
      paragraph: false,
      bulletList: false,
      orderedList: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
    }),
    BlockId,
    CustomDocument,
    CustomHeading,
    CustomParagraph,
    CustomBulletList,
    CustomOrderedList,
    CustomCodeBlock,
    CustomBlockQuote,
    CustomHorizontalRule,
    EngramLink,
    Link.extend({ inclusive: false }).configure({
      autolink: true,
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return "What’s the title?";
        }

        return "Can you add some further context?";
      },
    }),
  ],
  onSelectionUpdate({ editor }) {
    // console.log(editor.getJSON());
    // let { from, to } = editor.view.state.selection;
    //
    // let selectedNodes: any[] = [];
    // editor.view.state.doc.nodesBetween(from, to, (node, pos) => {
    //   const resolvedPos = editor.view.state.doc.resolve(pos);
    //
    //   console.log(resolvedPos.parent.attrs.blockId);
    //
    //   // if (node.isBlock && !node.parent) {
    //   //   selectedNodes.push(node);
    //   // }
    // });
    // console.log(selectedNodes.map((selected) => selected.attrs.blockId));
    // let { from } = editor.state.selection;
    // let node = editor.state.doc.nodeAt(from);
    //
    // while (node && node.isText) {
    //   node = node.parent;
    // }
    //
    // console.log(node);
  },
  onUpdate({ editor }) {
    editorStore.setBlocksInHtml(editor.getHTML());
    console.log(editor.getJSON());
  },
});
</script>

<template>
  <editor-content :editor="editor" />
</template>

<style lang="scss">
/* This controls the editor. */
.tiptap {
  /* Creates spacing between each block. */
  > * + * {
    margin-top: 0.75em;
  }

  ul,
  ol {
    padding: 0 1rem;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: 1.1;
  }

  code {
    background-color: rgba(#616161, 0.1);
    color: #616161;
  }

  pre {
    background: #0d0d0d;
    color: #fff;
    font-family: "JetBrainsMono", monospace;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;

    code {
      color: inherit;
      padding: 0;
      background: none;
      font-size: 0.8rem;
    }
  }

  img {
    max-width: 100%;
    height: auto;
  }

  blockquote {
    padding-left: 1rem;
    border-left: 2px solid rgba(#0d0d0d, 0.1);
  }

  hr {
    border: none;
    border-top: 2px solid rgba(#0d0d0d, 0.1);
    margin: 2rem 0;
  }

  /* Placeholder (on every new line) */
  .is-empty::before {
    content: attr(data-placeholder);
    float: left;
    color: #ced4da;
    pointer-events: none;
    height: 0;
  }
}

.ProseMirror:focus {
  outline: none;
}
</style>
