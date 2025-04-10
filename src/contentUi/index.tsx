import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import SideDrawer from "../components/SideDrawer";
import CaptionsList from "../components/CaptionsList";
import { CaptionData } from "../types";
import { CaptionEnableReminderToast } from "../components/CaptionEnableReminderToast";
import {
  observeCaptionChanges,
  observePageForCaptionContainer,
} from "../utils/caption";
import { getMeetingTitle, isCheckCaptionActive } from "../utils/scraper";

/**
 * Meet Caption Assistantのサイドドロワー UI
 */
const CaptionAssistantUI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true); // 初期状態を開いた状態に変更
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [highlightedCaptionId, setHighlightedCaptionId] = useState<
    number | undefined
  >(undefined);

  const isCaptionsEnabled = isCheckCaptionActive();
  // const isMeetingStarted = getMeetingTitle() !== null;
  const isMeetingStarted = true;

  // キャプションデータを取得する
  useEffect(() => {
    // 字幕を処理するコールバック関数
    const handleCaptions = (newCaptions: CaptionData[]) => {
      setCaptions((prevCaptions) => {
        // 新しい字幕を処理する
        const updatedCaptions = [...prevCaptions];

        newCaptions.forEach((newCaption) => {
          // 同じタイムスタンプと話者を持つ字幕を検索
          const existingIndex = updatedCaptions.findIndex(
            (caption) =>
              caption.timestamp === newCaption.timestamp &&
              caption.speaker === newCaption.speaker
          );

          if (existingIndex !== -1) {
            // 既存の字幕が見つかった場合は更新
            updatedCaptions[existingIndex] = newCaption;
          } else {
            // 新しい字幕を追加
            updatedCaptions.push(newCaption);
          }
        });

        return updatedCaptions;
      });
    };

    // 字幕コンテナを監視
    // TODO: オブサーブの仕組み
    observePageForCaptionContainer(() => {
      observeCaptionChanges(handleCaptions);
    });
  }, []);

  return (
    <>
      {/* 字幕有効化リマインダー */}
      {isMeetingStarted && !isCaptionsEnabled && (
        <CaptionEnableReminderToast onClose={() => setIsOpen(false)} />
      )}

      {/* トグルボタン */}
      <div className="fixed top-20 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          aria-label={isOpen ? "字幕履歴を閉じる" : "字幕履歴を開く"}
          style={{
            backgroundColor: "#3b82f6",
            color: "white",
            borderRadius: "9999px",
            padding: "0.75rem",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            position: "fixed",
            top: "5rem",
            right: "1rem",
            zIndex: 9999,
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "1.5rem", height: "1.5rem" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      </div>

      {/* サイドドロワー */}
      <SideDrawer
        captions={captions}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        {captions.length > 0 ? (
          <CaptionsList
            captions={captions}
            highlightedCaptionId={highlightedCaptionId}
          />
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p>字幕がまだありません。</p>
            {!isCaptionsEnabled && (
              <p className="mt-2 text-sm">
                キーボードの「c」キーを押して字幕を有効にしてください。
              </p>
            )}
          </div>
        )}
      </SideDrawer>
    </>
  );
};

// UIをDOMに挿入する関数
export const injectUI = () => {
  // すでに挿入されている場合は何もしない

  // スタイルシートを挿入
  const style = document.createElement("style");
  style.textContent = `
    #meet-caption-assistant-root {
      font-family: 'Roboto', sans-serif;
      position: relative;
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);

  // React用のルート要素を作成
  const rootElement = document.createElement("div");
  rootElement.id = "meet-caption-assistant-root";
  document.body.appendChild(rootElement);

  try {
    // React 18の新しいAPIを使用してレンダリング
    const root = createRoot(rootElement);
    root.render(<CaptionAssistantUI />);
  } catch (error) {
    console.error(
      "Meet Caption Assistant: UIの挿入中にエラーが発生しました",
      error
    );
  }
};
