import { defineBackground } from "wxt/sandbox";
import { saveCaptionsToNotion } from "@/src/utils/notion";
import { downloadMarkdown } from "@/src/utils/download";

export default defineBackground(() => {
  // 発言候補（Gemini）は廃止した。旧バージョンで保存した API キーを残さない
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.remove("geminiApiKey");
  });

  // メッセージリスナーを設定
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // マークダウンファイルのダウンロードメッセージを処理
    if (message.type === "download-markdown") {
      downloadMarkdown(
        message.data.name,
        message.data.content,
        message.data.saveAs
      )
        .then(sendResponse)
        .catch((error) => {
          console.error("マークダウンダウンロードエラー:", error);
          sendResponse({ error: error.message });
        });
      return true; // 非同期応答のために必要
    }

    // オプションページを開くメッセージを処理
    if (message.type === "open-options-page") {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      return true;
    }

    // Notionエクスポートのメッセージを処理
    if (message.type === "NOTION_EXPORT") {
      saveCaptionsToNotion(
        message.payload.captions,
        message.payload.meetingTitle
      )
        .then(() => sendResponse({ ok: true }))
        .catch((error) => {
          console.error("Notionエクスポートエラー:", error);
          sendResponse({ ok: false, error: error.message });
        });
      return true; // 非同期応答のために必要
    }
  });
});
