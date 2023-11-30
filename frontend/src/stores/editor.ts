import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const useEditorStore = defineStore("editor", () => {
  const title = ref("");
  const blocks = ref("");

  const titleIsEditable = computed(() => {
    const parser = new DOMParser();
    const nonEditableTitles = ["Multi-Tool", "Starred"];

    return !nonEditableTitles.includes(
      (parser.parseFromString(title.value, "text/html").body.firstChild as HTMLElement)?.innerHTML,
    );
  });
  const blocksAreEditable = computed(() => {
    const parser = new DOMParser();

    return !["Multi-Tool"].includes(
      (parser.parseFromString(title.value, "text/html").body.firstChild as HTMLElement)?.innerHTML,
    );
  });

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

  return { title, blocks, titleIsEditable, blocksAreEditable, setTitle, setBlocks, fetchEngram };
});
