<script setup lang="ts">
import { storeToRefs } from "pinia";
import CustomEditor from "@/components/CustomEditor.vue";
import { useEditorStore } from "@/stores/editor";

const editorStore = useEditorStore();
const { blocksInHtml } = storeToRefs(editorStore);
</script>

<template>
  <div class="view-container">
    <div class="view-area">
      <CustomEditor v-model="blocksInHtml" />
    </div>
  </div>
</template>
