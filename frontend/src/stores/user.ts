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

    return { userId, userIsLoggedIn, setUserId }; // userId needs to be returned for it to persist
  },
  {
    persist: true,
  },
);
