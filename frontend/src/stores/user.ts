import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const useUserStore = defineStore("user", () => {
  const username = ref("");

  const userIsLoggedIn = computed(() => !!username.value);

  function setUsername(newUsername: string) {
    username.value = newUsername;
  }

  return { userIsLoggedIn, setUsername };
});
