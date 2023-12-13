<template>
  <node-view-wrapper class="engram-link" :class="{ 'is-tag': node.attrs.isTag !== null }" as="span" @click="goToEngram">
    <button v-if="node.attrs.isTag !== null">#{{ node.attrs.targetTitle }}</button>
    <button v-else class="btn btn-sm normal-case"><i class="pi pi-file"></i>{{ node.attrs.targetTitle }}</button>
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
      this.$router.push(`/engrams/${this.node.attrs.targetTitle}`);
    },
  },

  async mounted() {
    const axiosInstance = createAxiosInstance(this.$router);

    if (this.node.attrs.targetId && !this.node.attrs.targetTitle) {
      /* If the link has been created from raw HTML, need to locate the title for display purposes and also identify the actual content blocks later. */

      const titleResponse = await axiosInstance(`/api/engrams/${this.node.attrs.targetId}/title`);
      this.updateAttributes({
        targetTitle: titleResponse.data,
      });
    } else if (this.node.attrs.targetTitle && !this.node.attrs.targetId) {
      /* Otherwise, if user had just created a link, need to persist it with an id */

      const idResponse = await axiosInstance(`/api/engrams/${this.node.attrs.targetTitle}/id`);
      this.updateAttributes({
        targetId: idResponse.data,
      });
    }
  },
};
</script>
