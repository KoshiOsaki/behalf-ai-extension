import { defineBackground } from "wxt/sandbox";
import { saveCaptionsToNotion } from "@/src/utils/notion";
import { handleGeminiCall } from "@/src/utils/gemini";
import { downloadMarkdown } from "@/src/utils/download";

export default defineBackground(() => {
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
    if (message.type === "call-gemini") {
      handleGeminiCall(message.data)
        .then(sendResponse)
        .catch((error) => {
          console.error("Gemini API呼び出しエラー:", error);
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
