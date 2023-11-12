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
import MoreOptions from "@/components/MoreOptions.vue";

const editorStore = useEditorStore();
await editorStore.fetchBlocksInHtml();

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
    console.log(editor.getJSON()?.content?.map((block) => block?.attrs?.blockId));
  },
});
</script>

<template>
  <editor-content :editor="editor" />
  <MoreOptions />
</template>

<style lang="scss">
/* This controls the editor. */
.tiptap {
  /* Creates spacing between each block. */
  > * + * {
    margin-top: 0.75em;
  }

  /* Creates a margin above scrolled elements to avoid overlap with navbar */
  > * {
    scroll-margin-top: 40px; // = height of navbar
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
