<script setup lang="ts">
import { useRouter } from "vue-router";
import axios from "axios";
import { useUserStore } from "@/stores/user";
import resetAllStores from "@/utils/reset-stores";

const router = useRouter();
const userStore = useUserStore();

async function logout() {
  try {
    await axios("/api/logout");

    resetAllStores();

    router.push("/login");
  } catch (err) {
    console.error(err);
  }
}
</script>

<template>
  <nav>
    <div class="left-icons">
      <RouterLink
        v-if="userStore.userIsLoggedIn"
        class="btn btn-sm btn-square"
        :class="{ 'btn-ghost': $route.name !== 'engrams' }"
        to="/engrams"
      >
        <i class="pi pi-database"></i>
      </RouterLink>
      <RouterLink
        v-if="userStore.userIsLoggedIn"
        class="btn btn-sm btn-square"
        :class="{ 'btn-ghost': $route.path !== '/engrams/Starred' }"
        to="/engrams/Starred"
      >
        <i class="pi pi-star"></i>
      </RouterLink>
    </div>
    <div class="right-icons">
      <button v-if="userStore.userIsLoggedIn" class="btn btn-sm btn-square btn-ghost" @click="logout">
        <i class="pi pi-sign-out"></i>
      </button>
      <RouterLink v-else class="btn btn-sm btn-square" :class="{ 'btn-ghost': $route.name !== 'login' }" to="/login">
        <i class="pi pi-sign-in"></i>
      </RouterLink>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
nav {
  width: 100%;
  height: 40px;

  position: sticky;
  top: 0;

  /* TODO: make this behave like google's search bar ? */
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  z-index: 99;

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-icons,
.right-icons {
  > * {
    margin: 4px;
  }
}

.left-icons > * + * {
  margin-left: 0;
}

.pi {
  font-size: 20px;
}
</style>
