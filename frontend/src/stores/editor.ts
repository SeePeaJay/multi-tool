import { ref } from "vue";
import { defineStore } from "pinia";

export const useEditorStore = defineStore("editor", () => {
  const titleInHtml = ref("");
  const blocksInHtml = ref("");

  function setTitleInHtml(newTitle: string) {
    titleInHtml.value = newTitle;
  }
  function setBlocksInHtml(newBlockContents: string) {
    blocksInHtml.value = newBlockContents;
  }

  async function fetchBlocksInHtml(engramId?: string) {
    try {
      const getBlocksResponse = await fetch(engramId ? `/api/engrams/${engramId}` : "/api");
      const blocksInHtml = await getBlocksResponse.json();

      const parser = new DOMParser();
      const titleInHtml = (parser.parseFromString(blocksInHtml, "text/html").body.firstChild as HTMLElement)?.outerHTML;

      setTitleInHtml(titleInHtml);
      setBlocksInHtml(blocksInHtml.join("").replace(titleInHtml, ""));
    } catch (err) {
      console.error(err);
    }
  }

  return { titleInHtml, blocksInHtml, fetchBlocksInHtml, setTitleInHtml, setBlocksInHtml };
});
