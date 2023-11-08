<script setup lang="ts">
import { useForm } from "vee-validate";

function required(value: string) {
  return value ? true : "This field is required!";
}

const { defineInputBinds, handleSubmit, errors } = useForm({
  validationSchema: {
    username: required,
    password: required,
    confirmPassword: required,
  },
});

const username = defineInputBinds("username");
const password = defineInputBinds("password");
const confirmPassword = defineInputBinds("confirmPassword");

const onSubmit = handleSubmit((values) => {
  // Submit to API
  console.log(values);
});
</script>

<template>
  <div class="view-container">
    <div class="view-area">
      <div>
        <h1>Sign Up</h1>
        <span>Just a few things to get started</span>
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
        <label class="label">
          <span class="label-text">Confirm Password</span>
        </label>
        <input
          type="password"
          v-bind="confirmPassword"
          class="input input-bordered w-full max-w-xs"
          :class="{ 'input-error': errors.confirmPassword }"
        />
        <label class="label">
          <span class="label-text-alt text-red-500">{{ errors.confirmPassword }}</span>
        </label>
        <label class="label"></label>
        <button class="btn">Submit</button>
        <span>Already a user? <RouterLink class="pressable link" to="/login"> Login</RouterLink></span>
      </form>
    </div>
  </div>
</template>
