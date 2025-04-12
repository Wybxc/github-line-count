import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";
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
        description: "Count lines of code in GitHub repositories",
        version: "0.0.1",
        grant: [
          "GM_registerMenuCommand",
          "GM_getValue",
          "GM_setValue",
          "GM.xmlHttpRequest",
        ],
        match: ["*://github.com/*"],
        connect: ["*://api.github.com/*"],
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
  optimization: {
    minimize: false,
  },
  devServer: {
    webSocketServer: false,
  },
});
