import { ref } from "vue";
import { defineStore } from "pinia";

export const useEditorStore = defineStore("editor", () => {
  const blocksInHtml = ref(``);

  function setBlocksInHtml(newBlockContents: string) {
    blocksInHtml.value = newBlockContents;
  }

  async function fetchBlocksInHtml() {
    try {
      const getBlocksResponse = await fetch("/blocks");
      const blocksInHtml = await getBlocksResponse.json();

      setBlocksInHtml(blocksInHtml.join(""));
    } catch (err) {
      console.error(err);
    }
  }

  return { blocksInHtml, fetchBlocksInHtml, setBlocksInHtml };
});
