<script setup lang="ts">
import EngramEditor from "@/components/EngramEditor.vue";
</script>

<template>
  <div class="view-container">
    <div class="view-area">
      <Suspense>
        <template #fallback>
          <div></div>
        </template>

        <EngramEditor />
      </Suspense>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* view-area div now has 2 children, so the global .view-area css will create some spacing right above the editor title; this is needed to re-align the title with the title from other views */
.view-area {
  > * + * {
    margin-top: 0;
  }
}
</style>
