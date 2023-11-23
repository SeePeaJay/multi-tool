<script setup lang="ts">
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";

interface CredentialResponse {
  clientId: string;
  client_id: string;
  credential: string;
  select_by: string;
}

const router = useRouter();
const userStore = useUserStore();

async function handleCredentialResponse(credentialResponse: CredentialResponse) {
  try {
    // console.log(credentialResponse.credential);

    const loginResponse = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentialResponse.credential}`,
      },
    });

    if (!loginResponse.ok) {
      throw new Error(`HTTP error! Status: ${loginResponse.status}`);
    }

    const userId = await loginResponse.json();
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
