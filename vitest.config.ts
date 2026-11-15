import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    env: loadEnv(mode, process.cwd(), ""), 
    include: ["tests/**/*.test.ts"],
    fileParallelism: false, 
    testTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
}));
