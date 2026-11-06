import { defineBackground } from "wxt/sandbox";
import { saveCaptionsToNotion } from "@/src/utils/notion";
import { downloadMarkdown } from "@/src/utils/download";
import {
  HostResponse,
  LOCAL_TRANSCRIPT_STORAGE_KEY,
  LocalTranscriptSettings,
  LocalTranscriptWriteRequest,
  TRANSCRIPT_HOST_NAME,
} from "@/src/utils/localTranscript";

const describeHostError = (message: string) =>
  /not found|forbidden/i.test(message)
    ? "字幕保存用のホストが見つかりません。scripts/install-transcript-host.sh を実行してください。"
    : message;

const sendToTranscriptHost = async (message: object): Promise<HostResponse> => {
  // nativeMessaging は optional_permissions。設定画面で許可されるまで API 自体が生えない
  const granted = await chrome.permissions.contains({ permissions: ["nativeMessaging"] });
  if (!granted || !chrome.runtime.sendNativeMessage) {
    return { ok: false, error: "nativeMessaging の権限が許可されていません。設定画面で有効にしてください。" };
  }
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(TRANSCRIPT_HOST_NAME, message, (response) => {
      const runtimeError = chrome.runtime.lastError?.message;
      if (runtimeError) {
        resolve({ ok: false, error: describeHostError(runtimeError) });
        return;
      }
      resolve(response ?? { ok: false, error: "ホストから応答がありませんでした" });
    });
  });
};

const writeLocalTranscript = async (request: LocalTranscriptWriteRequest): Promise<HostResponse> => {
  const storage = await chrome.storage.local.get(LOCAL_TRANSCRIPT_STORAGE_KEY);
  const settings = storage[LOCAL_TRANSCRIPT_STORAGE_KEY] as LocalTranscriptSettings | undefined;
  if (!settings?.enabled) return { ok: false, error: "disabled" };
  const result = await sendToTranscriptHost({
    type: "write",
    fileName: request.fileName,
    content: request.content,
  });
  if (!result.ok) console.warn("Gijiro: 字幕のローカル保存に失敗しました", result.error);
  return result;
};

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

    // 字幕をこの PC のファイルに書き出す（設定で ON のときだけ）
    if (message.type === "local-transcript-write") {
      writeLocalTranscript(message as LocalTranscriptWriteRequest)
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    // 設定画面の接続テスト
    if (message.type === "local-transcript-ping") {
      sendToTranscriptHost({ type: "ping" })
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error.message }));
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
