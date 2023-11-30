import { ref } from "vue";
import { defineStore } from "pinia";

export const useEditorStore = defineStore("editor", () => {
  const title = ref("");
  const blocks = ref("");

  function setTitle(newTitle: string) {
    title.value = newTitle;
  }
  function setBlocks(newBlockContents: string) {
    blocks.value = newBlockContents;
  }

  async function fetchEngram(engramId?: string) {
    try {
      const getBlocksResponse = await fetch(engramId ? `/api/engrams/${engramId}` : "/api");
      const blocks = await getBlocksResponse.json();

      const parser = new DOMParser();
      const title = (parser.parseFromString(blocks, "text/html").body.firstChild as HTMLElement)?.outerHTML;

      setTitle(title);
      setBlocks(blocks.join("").replace(title, ""));
    } catch (err) {
      console.error(err);
    }
  }

  return { title, blocks, fetchEngram, setTitle, setBlocks };
});
