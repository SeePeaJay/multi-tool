<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Engram {
  id: string;
  title: string;
}

const engrams = ref<Engram[]>([]);

onMounted(async () => {
  try {
    const engramsResponse = await fetch("/api/engrams");

    if (!engramsResponse.ok) {
      throw new Error(`HTTP error! Status: ${engramsResponse.status}`);
    }

    engrams.value = await engramsResponse.json();

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
