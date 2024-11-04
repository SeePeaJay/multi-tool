/*
 * For some reason, having a separate `vitest.config.ts` file containing the `test` property doesn't work, causing `ReferenceError: React is not defined` when running `npm run test`.
 * Which is why we import "vitest/config" in this file to incorporate `test`, and it seems to work as seen from https://codingwithmanny.medium.com/quick-vitest-setup-with-vitejs-react-typescript-bea9d3a01b07 and https://stackoverflow.com/a/72149404
 */
import { defineConfig } from "vitest/config";

import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
