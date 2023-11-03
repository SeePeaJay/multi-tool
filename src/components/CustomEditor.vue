<script setup lang="ts">
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { useEditorStore } from "@/stores/editor";
import {
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
  AutoLink,
  BlockPlaceholder,
} from "@/utils/editor-extensions";

const editorStore = useEditorStore();

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
    AutoLink,
    BlockPlaceholder,
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
