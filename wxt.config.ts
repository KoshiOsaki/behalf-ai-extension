import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  manifest: {
    name: "Gijiro",
    description: "会話を自分のPCに残せる、Google Meet用のローカル議事録ツール",
    version: "0.1.5",
    options_ui: {
      page: "options/index.html",
      open_in_tab: true,
    },
    background: {
      service_worker: "background.js",
      type: "module",
    },
    permissions: ["storage", "downloads"],
    host_permissions: [
      "https://generativelanguage.googleapis.com/*",
      "https://api.notion.com/*",
    ],
  },
});
