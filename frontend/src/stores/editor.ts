import { ref } from "vue";
import { defineStore } from "pinia";

export const useEditorStore = defineStore("editor", () => {
  const blocksInHtml = ref(``);

  async function fetchBlocksInHtml() {
    try {
      const getBlocksResponse = await fetch("http://localhost:8000/blocks");
      const blocksInHtml = await getBlocksResponse.json();

      setBlocksInHtml(blocksInHtml.join(""));
    } catch (err) {
      console.error(err);
    }
  }

  function setBlocksInHtml(newBlockContents: string) {
    blocksInHtml.value = newBlockContents;
  }

  return { blocksInHtml, fetchBlocksInHtml, setBlocksInHtml };
});
