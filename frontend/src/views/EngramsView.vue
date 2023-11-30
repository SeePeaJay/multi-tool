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
      <table>
        <tr>
          <th>
            <button class="btn btn-sm btn-square btn-ghost">
              <i class="pi pi-trash"></i>
            </button>
          </th>
        </tr>
        <tr>
          <th>
            <input type="checkbox" />
          </th>
          <th>Title</th>
        </tr>
        <tr>
          <td style="text-align: center">
            <input type="checkbox" />
          </td>
          <td style="text-align: center">
            <router-link v-for="engram in engrams" :key="engram.id" :to="`/engrams/${engram.id}`">
              {{ engram.title }}
            </router-link>
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pi {
  font-size: 16px;
}
</style>
