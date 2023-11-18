<script setup lang="ts">
// import { useForm } from "vee-validate";

interface CredentialResponse {
  clientId: string;
  client_id: string;
  credential: string;
  select_by: string;
}

let globalWithHandleCredentialResponse = globalThis as typeof globalThis & {
  handleCredentialResponse: (response: CredentialResponse) => void;
};
globalWithHandleCredentialResponse.handleCredentialResponse = async (response: CredentialResponse) => {
  console.log(response.credential);

  await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${response.credential}`,
    },
    body: JSON.stringify({
      /* your request body */
    }),
  });

  await fetch("/api/engramTitles");
};
</script>

<template>
  <div class="view-container">
    <div class="view-area">
      <div>
        <h1>Login</h1>
        <span>Welcome back</span>
      </div>
      <div
        id="g_id_onload"
        data-client_id="736880120177-bugpjv7lqj1d34a0msp47lmptpaa2jlm.apps.googleusercontent.com"
        data-callback="handleCredentialResponse"
        data-auto_prompt="false"
      ></div>
      <div
        class="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="outline"
        data-text="sign_in_with"
        data-shape="rectangular"
        data-logo_alignment="left"
        data-width="120"
      ></div>
    </div>
  </div>
</template>
