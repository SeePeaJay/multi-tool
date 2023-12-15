<template>
  <node-view-wrapper class="engram-link" :class="{ 'is-tag': node.attrs.isTag !== null }" as="span" @click="goToEngram">
    <button v-if="node.attrs.isTag !== null">#{{ displayContent }}</button>
    <button v-else class="btn btn-sm normal-case"><i class="pi pi-file"></i>{{ displayContent }}</button>
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

  computed: {
    displayContent() {
      if (this.node.attrs.targetTitle) {
        return this.node.attrs.targetTitle + (this.node.attrs.isAnchor ? ` - ${this.node.attrs.anchorContent}` : "");
      }

      return "Unable to find reference";
    },
  },

  methods: {
    async goToEngram() {
      if (this.node.attrs.targetTitle) {
        await this.$router.push(`/engrams/${this.node.attrs.targetTitle}`);
      }

      if (this.node.attrs.isAnchor) {
        setTimeout(() => {
          const element = document.getElementById(this.node.attrs.targetId);

          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 120); // need to wait for editor data to finish loading
      }
    },
  },

  async mounted() {
    const axiosInstance = createAxiosInstance(this.$router);

    if (this.node.attrs.targetId && !this.node.attrs.targetTitle) {
      /* If the link has been created from raw HTML, need to locate the title for display purposes and also identify the actual content blocks later. */

      const displayResponse = await axiosInstance(`/api/engrams/${this.node.attrs.targetId}/display`);
      this.updateAttributes({
        ...(displayResponse.data.title && { targetTitle: displayResponse.data.title }),
        ...(displayResponse.data.isAnchor && { isAnchor: displayResponse.data.isAnchor }),
        ...(displayResponse.data.anchorContent && { anchorContent: displayResponse.data.anchorContent }),
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
