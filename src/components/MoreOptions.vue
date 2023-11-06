<script setup lang="ts">
import { ref, watch } from "vue";
import { onClickOutside } from "@vueuse/core";

const moreOptionsButton = ref(null);
const moreOptionsMenu = ref(null);
const shouldShowMenu = ref(false);

/* This disables scrolling when the menu is active */
watch(shouldShowMenu, (newValue) => {
  document.body.style.overflow = newValue ? "hidden" : "auto";
});

/* This hides the menu when anywhere else is clicked */
onClickOutside(
  moreOptionsMenu,
  () => {
    shouldShowMenu.value = false;
  },
  { ignore: [moreOptionsButton] },
);
</script>

<template>
  <div id="more-options">
    <button
      class="btn btn-sm btn-square"
      :class="{ 'btn-ghost': !shouldShowMenu }"
      ref="moreOptionsButton"
      @click="shouldShowMenu = !shouldShowMenu"
    >
      <i class="pi pi-ellipsis-v"></i>
    </button>
    <ul
      v-if="shouldShowMenu"
      id="more-options-menu"
      class="menu menu-sm rounded-box w-28 p-1.5 bg-white border border-gray-100 shadow-lg"
      ref="moreOptionsMenu"
    >
      <li>
        <a><i class="pi pi-star"></i> Star</a>
      </li>
      <li>
        <a><i class="pi pi-trash"></i> Delete</a>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
#more-options {
  position: absolute;
  top: 1em; // based on 0.75 em which is the spacing between blocks
  left: calc(-32px - 0.25em); // 32px = dimension of the button

  z-index: 1; // needs to be above editor content
}

#more-options-menu {
  position: absolute; // to prevent moving the button when it's selected

  margin: 5px;
}

a {
  color: black;
  text-decoration: none;
}
</style>
