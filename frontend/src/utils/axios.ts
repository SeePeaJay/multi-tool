import axios from "axios";
import type { Router } from "vue-router";

/* I think this is necessary - cookie can expire right on api routes other than ping */
function createAxiosInstance(router: Router, userStore: any) {
  const axiosInstance = axios.create();

  axiosInstance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response.status === 403) {
        userStore.setUserId("");
        router.push("/login");
      }

      return Promise.reject(err.message);
    },
  );

  return axiosInstance;
}

export default createAxiosInstance;
