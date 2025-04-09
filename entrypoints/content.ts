import { injectUI } from "@/src/contentUi";
import { CaptionData } from "@/src/types";
import {
  observeCaptionChanges,
  observePageForCaptionContainer,
} from "@/src/utils/scraper";

export default defineContentScript({
  matches: ["*://*.meet.google.com/*"],
  main() {
    console.log("hello meettt");
    injectUI();
  },
});

// 字幕データを処理するコールバック関数
const handleCaptions = (captions: CaptionData[]) => {
  console.log("Meet Caption Assistant: 新しい字幕を検出しました", captions);

  // キャプションデータを保存する配列
  let captionHistory: CaptionData[] = [];

  // 新しい字幕をキャプション履歴に追加
  captionHistory = [...captionHistory, ...captions];

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

// Cキーのキーボードイベントをシミュレートして字幕を有効にする関数
const enableCaptionsWithKeyboardShortcut = () => {
  try {
    console.log(
      "Meet Caption Assistant: Cキーのショートカットを使用して字幕を有効化します"
    );

    // フォーカスがドキュメントにあることを確認
    if (document.activeElement !== document.body) {
      document.body.focus();
    }

    // キーダウンイベントを作成（Cキー）
    const keyDownEvent = new KeyboardEvent("keydown", {
      key: "c",
      code: "KeyC",
      keyCode: 67,
      which: 67,
      bubbles: true,
      cancelable: true,
    });

    // キーアップイベントを作成（Cキー）
    const keyUpEvent = new KeyboardEvent("keyup", {
      key: "c",
      code: "KeyC",
      keyCode: 67,
      which: 67,
      bubbles: true,
      cancelable: true,
    });

    // イベントをディスパッチ
    document.dispatchEvent(keyDownEvent);
    setTimeout(() => {
      document.dispatchEvent(keyUpEvent);
      console.log(
        "Meet Caption Assistant: Cキーのショートカットを送信しました"
      );

      // 字幕コンテナが表示されるのを待つ
      observePageForCaptionContainer(() => {
        console.log(
          "Meet Caption Assistant: 字幕コンテナが見つかりました。監視を開始します。"
        );
        const observer = observeCaptionChanges(handleCaptions);

        // 拡張機能のUIに状態を通知
        chrome.runtime
          .sendMessage({
            type: "CAPTIONS_ENABLED",
            data: { enabled: true },
          })
          .catch((error) => {
            // 接続エラーは無視
            if (!error.message.includes("Could not establish connection")) {
              console.error(
                "Meet Caption Assistant: メッセージ送信中にエラーが発生しました",
                error
              );
            }
          });
      });
    }, 100);
  } catch (error) {
    console.error(
      "Meet Caption Assistant: 字幕の有効化中にエラーが発生しました",
      error
    );
  }
};

// ミーティングUIが完全に読み込まれるまで待機してから字幕を有効化
const waitForMeetingUIAndEnableCaptions = () => {
  // ミーティングUIの要素を確認
  const meetingUIReady =
    document.querySelector('[aria-label="会議コントロール"]') ||
    document.querySelector(".VfPpkd-kBDsod") ||
    document.querySelector("[data-allocation-index]");

  if (meetingUIReady) {
    console.log(
      "Meet Caption Assistant: ミーティングUIが読み込まれました。字幕を有効化します。"
    );
    // UIが読み込まれたら少し待ってから字幕を有効化
    setTimeout(enableCaptionsWithKeyboardShortcut, 1500);
  } else {
    console.log("Meet Caption Assistant: ミーティングUIの読み込みを待機中...");
    // UIがまだ読み込まれていない場合は、再試行
    setTimeout(waitForMeetingUIAndEnableCaptions, 1000);
  }
};
