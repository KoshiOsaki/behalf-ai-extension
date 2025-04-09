import { injectUI } from "@/src/contentUi";
import { CaptionData } from "@/src/types";
import {
  findCaptionContainer,
  getMeetingTitle,
  observeCaptionChanges,
  observePageForCaptionContainer,
} from "@/src/utils/scraper";

export default defineContentScript({
  matches: ["*://*.meet.google.com/*"],
  main() {
    console.log("hello meet");
    injectUI();
    // 字幕があれば監視
    // observePageForCaptionContainer(() => {
    //   console.log(
    //     "Meet Caption Assistant: 字幕コンテナが見つかりました。監視を開始します。"
    //   );
    //   const observer = observeCaptionChanges(handleCaptions);
    // });
  },
});

// 字幕データを処理するコールバック関数
const handleCaptions = (captions: CaptionData[]) => {
  // キャプションデータを保存する配列
  let captionHistory: CaptionData[] = [];

  // 新しい字幕をキャプション履歴に追加
  captionHistory = [...captionHistory, ...captions];

  console.log("handleCaptions", captionHistory);

  // キャプションデータを拡張機能のポップアップに送信
  chrome.runtime
    .sendMessage({
      type: "CAPTIONS_UPDATED",
      data: captionHistory,
    })
    .catch((error) => {
      // 接続エラーは無視（ポップアップが開いていない場合など）
      if (error.message.includes("Could not establish connection")) {
        return;
      }
      console.error(
        "Meet Caption Assistant: メッセージ送信中にエラーが発生しました",
        error
      );
    });
};

// DOMを見て、会議が開始されているかをチェック
const checkIsMeetingStarted = () => {
  const title = getMeetingTitle();
  if (title) {
    console.log("meeting started");
  } else {
    console.log("meeting not started");
  }
};

// DOMを見て、字幕が有効になっているかをチェック
const checkIsCaptionEnabled = () => {
  const captionEnabled = findCaptionContainer();
  if (captionEnabled) {
    console.log("Caption enabled:", captionEnabled);
  } else {
    console.log("Caption not enabled");
  }
};
