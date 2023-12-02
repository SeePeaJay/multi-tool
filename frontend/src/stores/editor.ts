import { ref, computed } from "vue";
import { defineStore } from "pinia";
import axios from "axios";
import type { AxiosInstance } from "axios";

interface FetchEngramOptions {
  engramTitle: string;
  axiosInstance: AxiosInstance;
}

export const useEditorStore = defineStore("editor", () => {
  const title = ref("");
  const blocks = ref("");

  const titleIsEditable = computed(() => {
    const nonEditableTitles = ["Multi-Tool", "Starred"];
    return !nonEditableTitles.includes(title.value);
  });
  const blocksAreEditable = computed(() => {
    return !["Multi-Tool"].includes(title.value);
  });

  function setTitle(newTitle: string) {
    title.value = newTitle;
  }
  function setBlocks(newBlockContents: string) {
    blocks.value = newBlockContents;
  }

  async function fetchEngram({ engramTitle, axiosInstance }: FetchEngramOptions) {
    try {
      const getBlocksResponse = engramTitle ? await axiosInstance(`/api/engrams/${engramTitle}`) : await axios("/api");
      const blocks = getBlocksResponse.data;

      setTitle(engramTitle || "Multi-Tool");
      setBlocks(blocks.join(""));
    } catch (err) {
      console.error(err);
    }
  }

  return { title, blocks, titleIsEditable, blocksAreEditable, setTitle, setBlocks, fetchEngram };
});
