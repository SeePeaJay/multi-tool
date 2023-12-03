<script setup lang="ts">
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import createAxiosInstance from "../utils/axios";

interface CredentialResponse {
  clientId: string;
  client_id: string;
  credential: string;
  select_by: string;
}

const router = useRouter();
const userStore = useUserStore();
const axiosInstance = createAxiosInstance(router);

async function handleCredentialResponse(credentialResponse: CredentialResponse) {
  try {
    // console.log(credentialResponse.credential);

    const loginResponse = await axiosInstance({
      method: "POST",
      url: "/api/login",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentialResponse.credential}`,
      },
    });

    const userId = loginResponse.data;
    userStore.setUserId(userId);

    router.push("/engrams");
  } catch (err) {
    console.error(err);
  }
}
</script>

<template>
  <div class="view-container">
    <div class="view-area">
      <div>
        <h1>Login</h1>
        <span>Welcome back</span>
      </div>
      <GoogleLogin :callback="handleCredentialResponse" />
    </div>
  </div>
</template>
