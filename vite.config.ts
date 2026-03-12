import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  test: {
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
