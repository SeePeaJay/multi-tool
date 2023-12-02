<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { useEditorStore } from "@/stores/editor";
import { useUserStore } from "@/stores/user";
import MoreOptions from "@/components/MoreOptions.vue";
import {
  ModifiedStarterKit,
  BlockId,
  TitleDocument,
  BlocksDocument,
  HeadingWithId,
  ParagraphWithId,
  BulletListWithId,
  OrderedListWithId,
  CodeBlockWithId,
  BlockQuoteWithId,
  HorizontalRuleWithId,
  EngramLink,
  AutoLink,
  BlockPlaceholder,
} from "@/utils/editor-extensions";
import createAxiosInstance from "@/utils/axios";

const route = useRoute();
const router = useRouter();

const userStore = useUserStore();
const editorStore = useEditorStore();

await editorStore.fetchEngram({
  engramTitle: route.params.engramTitle as string,
  axiosInstance: createAxiosInstance(router, userStore),
});

/* Editor setup */
const titleEditor = useEditor({
  content: editorStore.title,
  extensions: [
    ModifiedStarterKit,
    TitleDocument,
    HeadingWithId,
    ParagraphWithId,
    EngramLink,
    AutoLink,
    BlockPlaceholder,
  ],
  editable: editorStore.titleIsEditable,
});
const blocksEditor = useEditor({
  content: editorStore.blocks,
  extensions: [
    ModifiedStarterKit,
    BlockId,
    BlocksDocument,
    HeadingWithId,
    ParagraphWithId,
    BulletListWithId,
    OrderedListWithId,
    CodeBlockWithId,
    BlockQuoteWithId,
    HorizontalRuleWithId,
    EngramLink,
    AutoLink,
    BlockPlaceholder,
  ],
  editable: editorStore.blocksAreEditable,
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
    editorStore.setBlocks(editor.getHTML());
    console.log(editor.getJSON()?.content?.map((block) => block?.attrs?.blockId));
  },
});
</script>

<template>
  <editor-content :editor="titleEditor" />
  <MoreOptions v-if="editorStore.titleIsEditable" />
  <editor-content :editor="blocksEditor" />
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
