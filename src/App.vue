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
</style>
