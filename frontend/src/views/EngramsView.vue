<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import createAxiosInstance from "../utils/axios";

interface Engram {
  id: string;
  title: string;
}

const router = useRouter();
const userStore = useUserStore();
const axiosInstance = createAxiosInstance(router, userStore);

const engrams = ref<Engram[]>([]);

onMounted(async () => {
  try {
    const engramsResponse = await axiosInstance("/api/engrams");

    engrams.value = engramsResponse.data;

    console.log(engramsResponse);
  } catch (err) {
    console.error(err);
  }
});
</script>

<template>
  <div class="view-container">
    <div class="view-area">
      <h1>Engrams</h1>
      <ul>
        <router-link v-for="engram in engrams" :key="engram.id" :to="`/engrams/${engram.id}`">
          {{ engram.title }}
        </router-link>
      </ul>
    </div>
  </div>
</template>
