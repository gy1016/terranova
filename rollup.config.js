import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import commonjs from "@rollup/plugin-commonjs";
import glslify from "rollup-plugin-glslify";
import serve from "rollup-plugin-serve";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const { NODE_ENV } = process.env;

export default [
  {
    input: "./src/index.ts",
    output: [
      // {
      //   dir: "dist",
      //   format: "cjs",
      //   entryFileNames: "[name].cjs.js",
      // },
      {
        dir: "dist",
        format: "esm",
        entryFileNames: "[name].js",
      },
    ],
    plugins: [
      resolve(),
      glslify({
        include: [/\.glsl$/],
      }),
      commonjs(),
      typescript({ tsconfig: path.resolve(dirname(fileURLToPath(import.meta.url)), "tsconfig.json") }),
      NODE_ENV === "development"
        ? serve({
            open: true,
            contentBase: ["public", "dist"],
            port: 9999,
          })
        : null,
    ],
  },
  {
    input: "./src/wasm/heat-map.worker.js",
    output: [
      {
        dir: "dist/wasm",
        format: "esm",
        entryFileNames: "[name].js",
      },
    ],
    plugins: [
      resolve(),
      typescript({
        include: "./src/config/wasm.ts",
      }),
    ],
  },
];
