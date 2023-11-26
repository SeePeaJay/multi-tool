import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import EngramsView from "../views/EngramsView.vue";
import EngramView from "../views/EngramView.vue";
import { useUserStore } from "@/stores/user";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: EngramView,
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/engrams",
      name: "engrams",
      component: EngramsView,
    },
    {
      path: "/engrams/:engramTitle",
      name: "engram",
      component: EngramView,
    },
  ],
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();

  if (to.path === "/" || to.path === "/login" || userStore.userIsLoggedIn) {
    next();
  } else {
    next("/login");
  }
});

export default router;
