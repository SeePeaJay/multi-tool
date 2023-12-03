<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import createAxiosInstance from "../utils/axios";

const router = useRouter();
const axiosInstance = createAxiosInstance(router);

const engramTitles = ref<string[]>([]);

onMounted(async () => {
  try {
    const engramsResponse = await axiosInstance("/api/engrams");

    engramTitles.value = engramsResponse.data;

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
            <router-link v-for="title in engramTitles" :key="title" :to="`/engrams/${title}`">
              {{ title }}
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
