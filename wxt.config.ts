import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  manifest: {
    name: "Gijiro",
    description: "会話を自分のPCに残せる、Google Meet用のローカル議事録ツール",
    version: "0.1.6",
    options_ui: {
      page: "options/index.html",
      open_in_tab: true,
    },
    background: {
      service_worker: "background.js",
      type: "module",
    },
    permissions: ["storage", "downloads"],
    // 字幕をこの PC に保存する（Native Messaging）人だけ設定画面で許可する。
    // 必須にすると既存ユーザーの更新時に権限の再承認が求められ、拡張が無効化されるため
    optional_permissions: ["nativeMessaging"],
    host_permissions: [
      "https://api.notion.com/*",
    ],
  },
});
