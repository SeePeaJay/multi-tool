<script setup lang="ts">
import { RouterView } from "vue-router";
import NavBar from "./components/NavBar.vue";
</script>

<template>
  <NavBar />
  <RouterView :key="$route.fullPath" />
</template>

<style lang="scss">
/* This handles the container and area of each view. Follows the same style as the editor. */
.view-container {
  display: flex;
  justify-content: center;
}

.view-area {
  width: 75%;
  margin: 8px 0 8px; // to give some spacing for the actual view

  > * + * {
    margin-top: 0.75em; // to provide spacing for elements in other views; based on the spacing b/w editor elements
  }

  position: relative; // to position the more options button properly
}

@media screen and (min-width: 1200px) {
  .view-area {
    width: 50%;
  }
}
</style>
