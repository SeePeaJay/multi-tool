<script setup lang="ts">
import { ref, computed } from "vue";
// import { useVuelidate } from '@vuelidate/core'
// import { required } from '@vuelidate/validators'

const username = ref("");
const password = ref("");
// const rules = computed(() => (
//   {
//     username: { required },
//     password: { required },
//   }
// ));
// const $v = useVuelidate(rules, { username, password });

const submitForm = () => {
  // $v.value.$touch()
  // if (!$v.value.$invalid) {
  //   // Handle login
  // }
};
</script>

<template>
  <div class="view-container">
    <div class="view-area">
      <div>
        <h1>Sign Up</h1>
        <span>Just a few things to get started</span>
      </div>
      <div class="form-control w-full max-w-xs">
        <label class="label">
          <span class="label-text">Username</span>
        </label>
        <input type="text" class="input input-bordered w-full max-w-xs" />
        <label class="label">
          <span class="label-text">Password</span>
        </label>
        <input type="password" class="input input-bordered w-full max-w-xs" />
        <label class="label">
          <span class="label-text">Confirm Password</span>
        </label>
        <input type="password" class="input input-bordered w-full max-w-xs" />
        <label class="label"></label>
        <button class="btn">Submit</button>
        <span>Already a user? <RouterLink class="pressable link" to="/login"> Login</RouterLink></span>
      </div>
    </div>
  </div>
</template>
