import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "react/index": "src/react/index.ts",
      "node/index": "src/node/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    minify: true,
    sourcemap: false,
    target: "es2020",
    external: ["axios", "react", "react-dom", "express"],
    shims: true,
    splitting: false,
  },
]);
