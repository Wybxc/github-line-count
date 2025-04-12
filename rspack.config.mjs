import { defineConfig } from "@rspack/cli";
import { UserscriptPlugin } from "webpack-userscript";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === "production";

// @ts-check
/** @type {import('@rspack/cli').Configuration} */
export default defineConfig({
  entry: "./src/index.ts",
  mode: isProduction ? "production" : "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/],
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: {
              syntax: "typescript",
            },
          },
        },
        type: "javascript/auto",
      },
    ],
  },
  plugins: [
    new UserscriptPlugin({
      headers: {
        name: "GitHub Line Count",
        namespace: "https://github.com/Wybxc/github-line-count",
        description: "Count lines of code in GitHub repositories",
        version: "1.0.0",
        author: "Wybxc",
        homepage: "https://github.com/Wybxc/github-line-count",
        license: "GPL-2.0-or-later",
        grant: [
          "GM_registerMenuCommand",
          "GM_getValue",
          "GM_setValue",
          "GM.xmlHttpRequest",
          "GM_xmlHttpRequest",
        ],
        match: ["*://github.com/*"],
        connect: ["api.github.com"],
        require: [
          "https://unpkg.com/badgen@3.2.3",
          "https://unpkg.com/human-format@1.2.1",
          "https://unpkg.com/@trim21/gm-fetch@0.3.0/dist/gm_fetch.js",
        ],
      },
      pretty: true,
      strict: true,
      whitelist: true,
      i18n: {
        "zh-CN": {
          description: "统计 GitHub 仓库的代码行数",
        },
      },
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  externals: {
    badgen: "badgen",
    "human-format": "humanFormat",
    "@trim21/gm-fetch": "GM_fetch",
  },
  optimization: {
    minimize: false,
  },
  devServer: {
    webSocketServer: false,
  },
});
