import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const useUserStore = defineStore(
  "user",
  () => {
    const userId = ref("");

    const userIsLoggedIn = computed(() => !!userId.value);

    function setUserId(newUserId: string) {
      userId.value = newUserId;
    }

    function $reset() {
      userId.value = "";
    }

    return { userId, userIsLoggedIn, setUserId, $reset }; // userId needs to be returned for it to persist
  },
  {
    persist: true,
  },
);
