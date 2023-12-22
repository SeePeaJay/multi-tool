import { ref, computed } from "vue";
import type { Ref } from "vue";
import { defineStore } from "pinia";
import axios from "axios";
import type { AxiosInstance } from "axios";
import { useDebounceFn } from "@vueuse/core";
import { getBlocksUpdatePayload, getRenamePayload } from "@/utils/update-engram-helpers";

interface FetchEngramOptions {
  engramId: string;
  axiosInstance: AxiosInstance;
}

export const useEditorStore = defineStore("editor", () => {
  const debounceUpdate = useDebounceFn(async (axiosInstance: AxiosInstance) => {
    await axiosInstance({
      method: "POST",
      url: `/api/engrams/${engramId.value}`,
      data: getBlocksUpdatePayload(blocksBeforeUpdate.value, blocks.value),
    });

    setBlocksBeforeUpdate("");
  }, 1000);

  const engramId = ref("");
  const title = ref("");
  const pendingTitle: Ref<string | null> = ref(null);
  const isRevertingTitle = ref(false);
  const blocks = ref("");
  const blocksBeforeUpdate = ref("");

  const titleIsEditable = computed(() => {
    const nonEditableTitles = ["Multi-Tool", "Starred"];
    return !nonEditableTitles.includes(title.value);
  });
  const blocksAreEditable = computed(() => {
    return !["Multi-Tool"].includes(title.value);
  });

  function setEngramId(currentEngramId: string) {
    engramId.value = currentEngramId;
  }
  function setTitle(newTitle: string) {
    title.value = newTitle;
  }
  function setPendingTitle(value: string | null) {
    pendingTitle.value = value;
  }
  function setIsRevertingTitle(value: boolean) {
    isRevertingTitle.value = value;
  }
  function setBlocks(newBlockContents: string) {
    blocks.value = newBlockContents;
  }
  function setBlocksBeforeUpdate(newBlocksBeforeUpdate: string) {
    blocksBeforeUpdate.value = newBlocksBeforeUpdate;
  }

  async function fetchEngram({ engramId, axiosInstance }: FetchEngramOptions) {
    try {
      const getBlocksResponse = engramId ? await axiosInstance(`/api/engrams/${engramId}`) : await axios("/api");
      const { title, blocks } = getBlocksResponse.data;

      setEngramId(engramId);
      setTitle(title || "Multi-Tool");
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
          url: `/api/engrams/${engramId.value}/rename`,
          data: getRenamePayload(title.value, pendingTitle.value),
        });

        setTitle(pendingTitle.value);
        setPendingTitle(null);
      } else if (pendingTitle.value === "") {
        setIsRevertingTitle(true);
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
  async function updateBlocks({ axiosInstance, newBlocks }: { axiosInstance: AxiosInstance; newBlocks: string }) {
    if (!blocksBeforeUpdate.value) {
      blocksBeforeUpdate.value = blocks.value;
    }

    setBlocks(newBlocks);

    try {
      await debounceUpdate(axiosInstance);
    } catch (err) {
      console.error(err);
    }
  }

  function $reset() {
    engramId.value = "";
    title.value = "";
    pendingTitle.value = null;
    isRevertingTitle.value = false;
    blocks.value = "";
    blocksBeforeUpdate.value = "";
  }

  return {
    engramId,
    title,
    pendingTitle,
    isRevertingTitle,
    blocks,
    titleIsEditable,
    blocksAreEditable,
    setPendingTitle,
    setIsRevertingTitle,
    fetchEngram,
    renameEngram,
    updateBlocks,
    $reset,
  };
});
