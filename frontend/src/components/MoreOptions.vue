<script setup lang="ts">
import { ref, watch } from "vue";
import { onClickOutside } from "@vueuse/core";

const moreOptionsButtonRef = ref(null);
const moreOptionsMenuRef = ref(null);
const confirmationModalRef = ref<HTMLDialogElement | null>(null);
const shouldShowMenu = ref(false);

function showModal() {
  confirmationModalRef.value?.showModal();
}

/* This disables scrolling when the menu is active */
watch(shouldShowMenu, (newValue) => {
  document.body.style.overflow = newValue ? "hidden" : "auto";
});

/* This hides the menu when anywhere else is clicked */
onClickOutside(
  moreOptionsMenuRef,
  () => {
    shouldShowMenu.value = false;
  },
  { ignore: [moreOptionsButtonRef] },
);
</script>

<template>
  <div id="more-options">
    <button
      ref="moreOptionsButtonRef"
      class="btn btn-sm btn-square"
      :class="{ 'btn-ghost': !shouldShowMenu }"
      @click="shouldShowMenu = !shouldShowMenu"
    >
      <i class="pi pi-ellipsis-v"></i>
    </button>
    <ul
      v-if="shouldShowMenu"
      id="more-options-menu"
      ref="moreOptionsMenuRef"
      class="menu menu-sm rounded-box w-28 p-1.5 bg-white border border-gray-100 shadow-lg"
    >
      <li>
        <a><i class="pi pi-star"></i> Star</a>
      </li>
      <li @click="showModal">
        <a><i class="pi pi-trash"></i> Delete</a>
      </li>
    </ul>
  </div>
  <dialog ref="confirmationModalRef" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Warning!</h3>
      <p class="py-4">Are you sure you want to permanently delete this engram?</p>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn btn-sm btn-warning">Confirm</button>
          <button class="btn btn-sm">Cancel</button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<style scoped lang="scss">
#more-options {
  position: absolute;
  top: -0.5em; // depends on the spacing b/w elements in .view-area
  left: calc(-32px - 0.25em); // 32px = dimension of the button

  z-index: 1; // needs to be above editor content

  .pi {
    font-size: 20px;
  }
}

#more-options-menu {
  position: absolute; // to prevent moving the button when it's selected

  margin: 5px;

  .pi {
    font-size: inherit;
  }
}

a {
  color: black;
  text-decoration: none;
}

.modal-action .btn {
  margin-left: 6px;
}
</style>
