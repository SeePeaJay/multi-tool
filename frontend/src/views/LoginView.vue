<script setup lang="ts">
interface CredentialResponse {
  clientId: string;
  client_id: string;
  credential: string;
  select_by: string;
}

async function handleCredentialResponse(response: CredentialResponse) {
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
