<template>
  <node-view-wrapper class="engram-link" :class="{ 'is-tag': node.attrs.isTag !== null }" as="span" @click="goToEngram">
    <template v-if="node.attrs.isTag !== null">#{{ node.attrs.target }}</template>
    <button v-else class="btn btn-sm normal-case"><i class="pi pi-file"></i>{{ node.attrs.target }}</button>
    <span>{{ node.attrs.targetId }}</span>
  </node-view-wrapper>
</template>

<script>
import { nodeViewProps, NodeViewWrapper } from "@tiptap/vue-3";
import createAxiosInstance from "@/utils/axios";

export default {
  components: {
    NodeViewWrapper,
  },

  props: nodeViewProps,

  methods: {
    goToEngram() {
      this.$router.push(`/engrams/${this.node.attrs.target}`);
    },
  },

  async mounted() {
    if (this.node.attrs.targetTitle && !this.node.attrs.targetId) {
      const axiosInstance = createAxiosInstance(this.$router);
      const idResponse = await axiosInstance(`/api/engrams/${this.node.attrs.target}/id`);

      this.updateAttributes({
        targetId: idResponse.data,
      });
    }
  },
};
</script>
