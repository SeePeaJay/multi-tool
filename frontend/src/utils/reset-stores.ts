import { defineStore, getActivePinia } from "pinia";

export default function resetAllStores() {
  const activePinia = getActivePinia();

  if (activePinia) {
    Object.entries(activePinia.state.value).forEach(([storeName, state]) => {
      const storeDefinition = defineStore(storeName, state);
      const store = storeDefinition(activePinia);

      store.$reset();
    });
  }
}
