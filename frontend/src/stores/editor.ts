import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { defineStore } from "pinia";
import axios from "axios";
import type { AxiosInstance } from "axios";

interface FetchEngramOptions {
  engramTitle: string;
  axiosInstance: AxiosInstance;
}

export const useEditorStore = defineStore("editor", () => {
  const router = useRouter();

  const title = ref("");
  const pendingTitle = ref("");
  const isRevertingTitle = ref(false);
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
  function setPendingTitle(newTitle: string) {
    pendingTitle.value = newTitle;
  }
  function setIsRevertingTitle(value: boolean) {
    isRevertingTitle.value = value;
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
  async function renameEngram(axiosInstance: AxiosInstance) {
    try {
      if (pendingTitle.value && pendingTitle.value !== title.value) {
        await axiosInstance({
          method: "PUT",
          url: `/api/engrams/${title.value}/rename`,
          data: { newEngramTitle: pendingTitle.value },
        });

        setTitle(pendingTitle.value);
        setPendingTitle("");
        await router.replace({ path: `/engrams/${title.value}` });
      } else {
        setPendingTitle("");
      }
    } catch (err) {
      const axiosError = err as string;

      if (axiosError === "Request failed with status code 400") {
        setIsRevertingTitle(true);
      } else {
        console.error(err);
      }
    }
  }

  function $reset() {
    title.value = "";
    blocks.value = "";
  }

  return {
    title,
    pendingTitle,
    isRevertingTitle,
    blocks,
    titleIsEditable,
    blocksAreEditable,
    setTitle,
    setPendingTitle,
    setIsRevertingTitle,
    setBlocks,
    fetchEngram,
    renameEngram,
    $reset,
  };
});
