<script setup lang="ts">
import { RouterView } from "vue-router";
import NavBar from "./components/NavBar.vue";
</script>

<template>
  <NavBar />
  <RouterView />
</template>

<style lang="scss">
/* This handles generic icons and buttons. */
.pressable {
  color: var(--inactive-color);

  &:hover {
    cursor: pointer;
    color: var(--default-color);
  }

  &.disabled {
    cursor: default;
    color: var(--disabled-color);
  }
}

/* This handles the container and area of each view. Follows the same style as the editor. */
.view-container {
  height: calc(100vh - 40px);
  display: flex;
  justify-content: center;
  overflow-y: scroll;
}

.view-area {
  width: 75%;
  margin: 8px 0 8px;
}

@media screen and (min-width: 1200px) {
  .view-area {
    width: 50%;
  }
}
</style>
