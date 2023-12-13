<script setup lang="ts">
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { useEditorStore } from "@/stores/editor";
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
const editorStore = useEditorStore();

await editorStore.fetchEngram({
  engramTitle: route.params.engramTitle as string,
  axiosInstance: createAxiosInstance(router),
});

/* Editor setup */
const titleEditor = useEditor({
  content: editorStore.title,
  extensions: [ModifiedStarterKit, TitleDocument, HeadingWithId, ParagraphWithId, AutoLink, BlockPlaceholder],
  editable: editorStore.titleIsEditable,
  onUpdate({ editor }) {
    if (editor.isFocused) {
      // clicking on the engram link title (which updates the title) can trigger this function, so the check is necessary to distinguish

      const pendingTitle =
        new DOMParser().parseFromString(editor.getHTML(), "text/html").body.firstElementChild?.textContent || "";
      editorStore.setPendingTitle(pendingTitle);
    }
  },
  onBlur() {
    editorStore.renameEngram(createAxiosInstance(router));
  },
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
    if (editor.isFocused) {
      // fetching the engram link title and updating the node attr can trigger this, so the check is necessary to distinguish

      editorStore.updateBlocks({
        axiosInstance: createAxiosInstance(router),
        newBlocks: editor.getHTML(),
      });
    }
  },
});

watch(
  () => route.params.engramTitle,
  async (newValue, oldValue) => {
    // the route update from axios interceptor seems to be detected by this watcher before the editor component is unmounted, so the check is needed to avoid sending unnecessary request
    if (!(oldValue && !newValue)) {
      await editorStore.fetchEngram({
        engramTitle: newValue as string,
        axiosInstance: createAxiosInstance(router),
      });

      titleEditor.value?.commands.setContent(editorStore.title);
      titleEditor.value?.setEditable(editorStore.titleIsEditable);

      blocksEditor.value?.commands.setContent(editorStore.blocks);
      blocksEditor.value?.setEditable(editorStore.blocksAreEditable);
    }
  },
);

/* In case title needs to be reverted */
watch(
  () => editorStore.isRevertingTitle,
  (newValue) => {
    if (newValue) {
      titleEditor.value?.commands.setContent(editorStore.title);
      editorStore.setPendingTitle("");
      editorStore.setIsRevertingTitle(false);
    }
  },
);
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
