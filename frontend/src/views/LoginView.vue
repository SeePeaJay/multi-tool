<script setup lang="ts">
import { useForm } from "vee-validate";

function required(value: string) {
  return value ? true : "This field is required!";
}

const { defineInputBinds, handleSubmit, errors } = useForm({
  validationSchema: {
    username: required,
    password: required,
  },
});

const username = defineInputBinds("username");
const password = defineInputBinds("password");

const onSubmit = handleSubmit((values) => {
  // Submit to API
  console.log(values);
});
</script>

<template>
  <div class="view-container">
    <div class="view-area">
      <div>
        <h1>Login</h1>
        <span>Welcome back</span>
      </div>
      <form class="form-control w-full max-w-xs" @submit="onSubmit">
        <label class="label">
          <span class="label-text">Username</span>
        </label>
        <input
          type="text"
          v-bind="username"
          class="input input-bordered w-full max-w-xs"
          :class="{ 'input-error': errors.username }"
        />
        <label class="label">
          <span class="label-text-alt text-red-500">{{ errors.username }}</span>
        </label>
        <label class="label">
          <span class="label-text">Password</span>
        </label>
        <input
          type="password"
          v-bind="password"
          class="input input-bordered w-full max-w-xs"
          :class="{ 'input-error': errors.password }"
        />
        <label class="label">
          <span class="label-text-alt text-red-500">{{ errors.password }}</span>
        </label>
        <label class="label"></label>
        <button class="btn">Submit</button>
        <span>Don't have an account? <RouterLink class="pressable link" to="/signup"> Sign Up</RouterLink></span>
      </form>
    </div>
  </div>
</template>
