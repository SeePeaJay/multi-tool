<script setup lang="ts">
import { Node } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin } from "prosemirror-state";
import { nanoid } from "nanoid";
import { useEditorStore } from "@/stores/editor";

const editorStore = useEditorStore();

/* Custom Document to force title */
const CustomDocument = Document.extend({
  content: "heading block*",
});

/* Create custom node to add block id to "block" nodes - https://github.com/ueberdosis/tiptap/issues/1041#issuecomment-917610594 */
const BlockType = {
  HEADING: "heading",
  PARAGRAPH: "paragraph",
  BULLETLIST: "bulletList",
  CODEBLOCK: "codeBlock",
  BLOCKQUOTE: "blockquote",
};
const nodeTypesThatShouldHaveBlockId = {
  [BlockType.HEADING]: true,
  [BlockType.PARAGRAPH]: true,
  [BlockType.BULLETLIST]: true,
  [BlockType.CODEBLOCK]: true,
  [BlockType.BLOCKQUOTE]: true,
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
          },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, oldState, newState) => {
          // no changes
          if (newState.doc === oldState.doc) {
            return;
          }
          const tr = newState.tr;

          newState.doc.descendants((node, pos, parent) => {
            if (
              node.isBlock &&
              parent === newState.doc &&
              !node.attrs.blockId &&
              nodeTypesThatShouldHaveBlockId[node.type.name]
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: nanoid(8),
              });
            }
          });

          return tr;
        },
      }),
    ];
  },
});

/* Editor setup */
const domParser = new DOMParser();
const editor = useEditor({
  content: editorStore.blocksInHtml,
  extensions: [
    CustomDocument,
    BlockId,
    StarterKit.configure({ document: false }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return "What’s the title?";
        }

        return "Can you add some further context?";
      },
    }),
  ],
  onUpdate({ editor }) {
    const blockIds: string[] = editor.getJSON().content?.map((x) => x.attrs?.blockId) || [];
    const blocksInHtml = Array.from(domParser.parseFromString(editor.getHTML(), "text/html").body.children).map(
      (element) => element.outerHTML,
    );
    const blocks: { [key: string]: string } = {};
    for (let i = 0; i < blockIds.length; i++) {
      blocks[blockIds[i]] = blocksInHtml[i];
    }

    editorStore.setBlocksInHtml(editor.getHTML());
    // console.log(editor.getHTML());
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
