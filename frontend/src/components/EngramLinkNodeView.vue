<template>
  <node-view-wrapper class="engram-link" :class="{ 'is-tag': node.attrs.isTag !== null }" as="span" @click="goToEngram">
    <template v-if="node.attrs.isTag !== null">#{{ node.attrs.target }}</template>
    <button v-else class="btn btn-sm normal-case"><i class="pi pi-file"></i>{{ node.attrs.target }}</button>
  </node-view-wrapper>
</template>

<script>
import { nodeViewProps, NodeViewWrapper } from "@tiptap/vue-3";

export default {
  components: {
    NodeViewWrapper,
  },

  props: nodeViewProps,

  methods: {
    goToEngram() {
      console.log("Go to engram.");
    },
  },
};
</script>
