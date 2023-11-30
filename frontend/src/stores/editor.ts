import { ref, computed } from "vue";
import { defineStore } from "pinia";
import axios from "axios";
import type { AxiosInstance } from "axios";

interface FetchEngramsOptions {
  engramId: string;
  axiosInstance: AxiosInstance;
}

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

  async function fetchEngram({ engramId, axiosInstance }: FetchEngramsOptions) {
    try {
      const getBlocksResponse = engramId ? await axiosInstance(`/api/engrams/${engramId}`) : await axios("/api");
      const blocks = getBlocksResponse.data;

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
