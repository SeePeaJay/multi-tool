import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import EngramsView from "../views/EngramsView.vue";
import EngramView from "../views/EngramView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
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

export default router;
