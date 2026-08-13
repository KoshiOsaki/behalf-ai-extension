import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import SideDrawer from "./SideDrawer";
import CaptionsList from "./CaptionsList";
import { CaptionData } from "../types";
import { CaptionEnableReminderToast } from "./CaptionEnableReminderToast";
import { observeCaptionLifecycle } from "../utils/caption";
import { getMeetingTitle, isCheckCaptionActive } from "../utils/scraper";

/**
 * Gijiroのサイドドロワー UI
 */
const CaptionAssistantUI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true); // 初期状態を開いた状態に変更
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [highlightedCaptionId, setHighlightedCaptionId] = useState<
    number | undefined
  >(undefined);

  const isCaptionsEnabled = isCheckCaptionActive() || captions.length > 0;
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
          // 同じ行(DOM要素ベースの id)を持つ字幕を検索。
          // 行の同一性は id で判定する（timestamp は初出時刻なので判定には使わない）。
          const existingIndex = updatedCaptions.findIndex(
            (caption) => caption.id === newCaption.id
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

    // 字幕コンテナを監視。region が作り直された場合は自動で貼り直す。
    const disposeCaptionObserver = observeCaptionLifecycle(handleCaptions);
    return () => {
      disposeCaptionObserver();
    };
  }, []);

  useEffect(() => {
    const handleToggleShortcut = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.key.toLowerCase() !== "o" ||
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.closest('[contenteditable="true"]'))
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsOpen((current) => !current);
    };

    document.addEventListener("keydown", handleToggleShortcut, true);
    return () => document.removeEventListener("keydown", handleToggleShortcut, true);
  }, []);

  return (
    <>
      {/* 字幕有効化リマインダー */}
      {isMeetingStarted && !isCaptionsEnabled && captions.length === 0 && (
        <CaptionEnableReminderToast onClose={() => setIsOpen(false)} />
      )}

      {/* パネルを閉じている時だけ表示するトグルボタン */}
      {!isOpen && <div className="bai-toggle-wrap">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bai-toggle-button"
          aria-label={captions.length > 0 ? "Gijiroを開く・字幕あり" : "Gijiroを開く"}
          aria-keyshortcuts="Meta+O Control+O"
        >
          <span>Gijiro</span>
          {captions.length > 0 && (
            <span className="bai-toggle-notification-dot" aria-hidden="true" />
          )}
        </button>
      </div>}

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
          <div className="bai-empty-state">
            <div className="bai-empty-icon" aria-hidden="true">···</div>
            <p>字幕がまだありません。</p>
            {!isCaptionsEnabled && (
              <p className="bai-empty-help">
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
      --bai-bg: #17181b;
      --bai-surface: #1e2024;
      --bai-surface-raised: #25272c;
      --bai-border: rgba(255, 255, 255, 0.085);
      --bai-border-strong: rgba(255, 255, 255, 0.13);
      --bai-text: #f4f4f5;
      --bai-text-muted: #9b9da4;
      --bai-text-faint: #6f727a;
      --bai-accent: #a99cf5;
      --bai-accent-soft: rgba(169, 156, 245, 0.13);
      font-family: 'Google Sans Text', 'Google Sans', Inter, Roboto, sans-serif;
      position: relative;
      z-index: 9999;
      color-scheme: dark;
    }

    #meet-caption-assistant-root *,
    #meet-caption-assistant-root *::before,
    #meet-caption-assistant-root *::after {
      box-sizing: border-box;
    }

    #meet-caption-assistant-root button {
      font: inherit;
    }

    .bai-drawer {
      position: fixed;
      inset: 0 0 0 auto;
      z-index: 9999;
      display: flex;
      width: min(392px, calc(100vw - 16px));
      height: 100%;
      flex-direction: column;
      overflow: hidden;
      color: var(--bai-text);
      background:
        radial-gradient(circle at 90% -10%, rgba(118, 98, 220, 0.13), transparent 29%),
        rgba(23, 24, 27, 0.975);
      border-left: 1px solid var(--bai-border-strong);
      box-shadow: -20px 0 60px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(24px) saturate(115%);
      transform: translateX(100%);
      transition: transform 220ms cubic-bezier(.2, .8, .2, 1);
    }

    .bai-drawer--open {
      transform: translateX(0);
    }

    .bai-header {
      display: flex;
      min-height: 72px;
      align-items: center;
      justify-content: space-between;
      padding: 14px 14px 14px 18px;
      border-bottom: 1px solid var(--bai-border);
    }

    .bai-heading,
    .bai-live-meta,
    .bai-caption-meta,
    .bai-footer-heading {
      display: flex;
      align-items: center;
    }

    .bai-heading {
      gap: 11px;
    }

    .bai-heading h2 {
      margin: 0 0 3px;
      color: var(--bai-text);
      font-size: 14px;
      font-weight: 620;
      letter-spacing: .01em;
      line-height: 1.2;
    }

    .bai-mark {
      display: flex;
      width: 31px;
      height: 31px;
      align-items: flex-end;
      justify-content: center;
      gap: 3px;
      padding: 8px;
      border: 1px solid rgba(169, 156, 245, .24);
      border-radius: 9px;
      background: linear-gradient(145deg, rgba(169, 156, 245, .2), rgba(169, 156, 245, .07));
    }

    .bai-mark span {
      display: block;
      width: 2px;
      border-radius: 2px;
      background: var(--bai-accent);
    }

    .bai-mark span:nth-child(1) { height: 7px; opacity: .7; }
    .bai-mark span:nth-child(2) { height: 13px; }
    .bai-mark span:nth-child(3) { height: 9px; opacity: .8; }

    .bai-live-meta {
      gap: 5px;
      color: var(--bai-text-faint);
      font-size: 10px;
      font-weight: 650;
      letter-spacing: .09em;
    }

    .bai-live-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #6dd8a2;
      box-shadow: 0 0 0 3px rgba(109, 216, 162, .09);
    }

    .bai-meta-separator { opacity: .55; }

    .bai-icon-button {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      padding: 0;
      color: var(--bai-text-muted);
      background: transparent;
      border: 0;
      border-radius: 9px;
      cursor: pointer;
      transition: color 140ms ease, background 140ms ease;
    }

    .bai-icon-button:hover {
      color: var(--bai-text);
      background: rgba(255, 255, 255, .06);
    }

    .bai-icon-button svg {
      width: 17px;
      height: 17px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 1.7;
    }

    .bai-ai-section {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      gap: 11px;
      align-items: center;
      margin: 12px 12px 8px;
      padding: 11px 12px;
      border: 1px solid rgba(169, 156, 245, .15);
      border-radius: 12px;
      background: linear-gradient(115deg, rgba(169, 156, 245, .095), rgba(255, 255, 255, .025));
    }

    .bai-ai-icon {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      color: var(--bai-accent);
      border-radius: 9px;
      background: rgba(169, 156, 245, .1);
    }

    .bai-ai-icon svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    .bai-ai-copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
    }

    .bai-ai-copy strong {
      overflow: hidden;
      color: #e8e7ed;
      font-size: 12px;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bai-ai-copy span {
      overflow: hidden;
      color: var(--bai-text-muted);
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bai-small-button {
      min-width: 46px;
      padding: 6px 9px;
      color: #c5c6cb;
      font-size: 10px !important;
      font-weight: 600 !important;
      line-height: 1;
      background: rgba(255, 255, 255, .055);
      border: 1px solid var(--bai-border);
      border-radius: 7px;
      cursor: pointer;
      transition: transform 140ms ease, background 140ms ease;
    }

    .bai-small-button:hover { background: rgba(255, 255, 255, .09); }
    .bai-small-button:active { transform: translateY(1px); }
    .bai-small-button:disabled { cursor: wait; opacity: .6; }
    .bai-small-button--accent {
      color: #dcd6ff;
      background: rgba(169, 156, 245, .12);
      border-color: rgba(169, 156, 245, .2);
    }

    .bai-suggestions {
      display: flex;
      flex-direction: column;
      gap: 7px;
      padding: 3px 12px 12px;
      border-bottom: 1px solid var(--bai-border);
    }

    .bai-section-label,
    .bai-footer-heading > span:first-child {
      color: var(--bai-text-faint);
      font-size: 10px;
      font-weight: 650;
      letter-spacing: .12em;
    }

    .bai-suggestion-card {
      display: flex;
      width: 100%;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 11px;
      color: #dfe0e4;
      font-size: 12px !important;
      line-height: 1.55;
      text-align: left;
      background: rgba(255, 255, 255, .035);
      border: 1px solid var(--bai-border);
      border-radius: 9px;
      cursor: pointer;
      transition: background 140ms ease, border-color 140ms ease;
    }

    .bai-suggestion-card:hover {
      background: rgba(255, 255, 255, .06);
      border-color: rgba(169, 156, 245, .22);
    }

    .bai-copy-label {
      flex: 0 0 auto;
      padding-top: 2px;
      color: var(--bai-text-faint);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .08em;
    }

    .bai-suggestion-empty {
      padding: 15px;
      color: var(--bai-text-muted);
      font-size: 12px;
      text-align: center;
      border: 1px dashed var(--bai-border-strong);
      border-radius: 9px;
    }

    .bai-scroll-area {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 7px 17px 22px 15px;
      scrollbar-color: rgba(255, 255, 255, .15) transparent;
      scrollbar-width: thin;
    }

    .bai-scroll-area::-webkit-scrollbar { width: 5px; }
    .bai-scroll-area::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, .14);
      border-radius: 99px;
    }

    .bai-caption-list {
      padding-top: 3px;
    }

    .bai-caption-item {
      position: relative;
      margin-left: 5px;
      padding: 12px 4px 17px 19px;
      border-left: 1px solid rgba(255, 255, 255, .09);
      transition: background 140ms ease;
    }

    .bai-caption-item:last-child { padding-bottom: 12px; }

    .bai-caption-item--highlighted {
      background: linear-gradient(90deg, rgba(169, 156, 245, .09), transparent 78%);
    }

    .bai-timeline-dot {
      position: absolute;
      top: 18px;
      left: -3.5px;
      width: 6px;
      height: 6px;
      border: 1.5px solid var(--bai-bg);
      border-radius: 50%;
      background: #777a82;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, .08);
    }

    .bai-caption-item:last-child .bai-timeline-dot {
      background: var(--bai-accent);
      box-shadow: 0 0 0 3px rgba(169, 156, 245, .1);
    }

    .bai-caption-meta {
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }

    .bai-caption-speaker {
      overflow: hidden;
      color: #e7e7ea;
      font-size: 11px;
      font-weight: 620;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bai-caption-time {
      flex: 0 0 auto;
      color: var(--bai-text-faint);
      font-size: 10px;
      font-variant-numeric: tabular-nums;
      letter-spacing: .02em;
    }

    .bai-caption-text {
      margin: 0;
      color: #c8c9ce;
      font-size: 13px;
      font-weight: 400;
      line-height: 1.65;
      white-space: pre-wrap;
      word-break: break-word;
      cursor: text;
      user-select: text;
    }

    .bai-footer {
      flex: 0 0 auto;
      padding: 11px 12px 12px;
      background: rgba(20, 21, 24, .94);
      border-top: 1px solid var(--bai-border);
      box-shadow: 0 -12px 30px rgba(0, 0, 0, .08);
    }

    .bai-footer-heading {
      justify-content: space-between;
      min-height: 15px;
      margin: 0 2px 7px;
    }

    .bai-footer-heading > span:last-child {
      font-size: 10px;
    }

    .bai-status--success { color: #78d8a8; }
    .bai-status--error { color: #f29c9c; }

    .bai-export-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .bai-export-button {
      display: flex;
      min-width: 0;
      height: 34px;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0 8px;
      overflow: visible;
      color: #b7b9c0;
      font-size: 10px !important;
      font-weight: 560 !important;
      white-space: nowrap;
      background: rgba(255, 255, 255, .035);
      border: 1px solid var(--bai-border);
      border-radius: 8px;
      cursor: pointer;
      transition: color 140ms ease, background 140ms ease, border-color 140ms ease;
    }

    .bai-export-button > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bai-export-button[data-tooltip] {
      position: relative;
    }

    .bai-export-button[data-tooltip]::before {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      z-index: 2;
      padding: 6px 8px;
      color: var(--bai-text);
      font-size: 11px;
      font-weight: 500;
      line-height: 1.35;
      white-space: nowrap;
      content: attr(data-tooltip);
      background: #303238;
      border: 1px solid var(--bai-border-strong);
      border-radius: 6px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, .3);
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 3px);
      transition: opacity 120ms ease, transform 120ms ease;
    }

    .bai-export-button[data-tooltip]:hover::before,
    .bai-export-button[data-tooltip]:focus-visible::before {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    .bai-export-button:hover:not(:disabled) {
      color: var(--bai-text);
      background: rgba(255, 255, 255, .065);
      border-color: var(--bai-border-strong);
    }

    .bai-export-button--primary {
      color: #ddd8ff;
      background: var(--bai-accent-soft);
      border-color: rgba(169, 156, 245, .2);
    }

    .bai-export-button:disabled {
      color: #686a70;
      cursor: not-allowed;
      opacity: .72;
    }

    .bai-export-button svg {
      flex: 0 0 auto;
      width: 13px;
      height: 13px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.6;
    }

    .bai-settings-link {
      display: block;
      margin: 7px auto 0;
      padding: 0;
      color: var(--bai-text-faint);
      font-size: 10px !important;
      background: none;
      border: 0;
      cursor: pointer;
    }

    .bai-settings-link:hover { color: var(--bai-text-muted); }

    .bai-empty-state {
      display: flex;
      min-height: 220px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--bai-text-muted);
      font-size: 12px;
      text-align: center;
    }

    .bai-empty-state p { margin: 0; }
    .bai-empty-icon {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      margin-bottom: 10px;
      color: var(--bai-text-faint);
      letter-spacing: 2px;
      border: 1px solid var(--bai-border);
      border-radius: 50%;
    }
    .bai-empty-help { margin-top: 5px !important; color: var(--bai-text-faint); font-size: 11px; }

    .bai-toggle-wrap {
      position: fixed;
      top: 136px;
      right: 14px;
      z-index: 9999;
    }

    .bai-toggle-button {
      position: relative;
      display: flex;
      min-width: 100px;
      height: 46px;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
      color: #fff;
      font-size: 14px !important;
      font-weight: 720 !important;
      letter-spacing: .015em;
      text-shadow: 0 1px 2px rgba(56, 44, 125, .32);
      background: linear-gradient(135deg, #a392f7 0%, #8473ed 52%, #7163dc 100%);
      border: 1px solid rgba(255, 255, 255, .34);
      border-radius: 14px;
      box-shadow:
        0 14px 38px rgba(87, 69, 187, .48),
        0 4px 12px rgba(0, 0, 0, .34),
        inset 0 1px 0 rgba(255, 255, 255, .22);
      backdrop-filter: blur(18px);
      cursor: pointer;
      transition: filter 140ms ease, transform 140ms ease, box-shadow 140ms ease;
    }

    .bai-toggle-button:hover {
      filter: brightness(1.08);
      box-shadow:
        0 17px 44px rgba(87, 69, 187, .56),
        0 5px 14px rgba(0, 0, 0, .36),
        inset 0 1px 0 rgba(255, 255, 255, .28);
      transform: translateY(-2px);
    }

    .bai-toggle-button:active { transform: translateY(0); }

    .bai-toggle-notification-dot {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 14px;
      height: 14px;
      background: #76d2a5;
      border: 3px solid #25232d;
      border-radius: 50%;
      box-shadow:
        0 0 0 2px rgba(118, 210, 165, .16),
        0 4px 10px rgba(50, 158, 106, .42);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .bai-drawer { transition: none; }
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
      "Gijiro: UIの挿入中にエラーが発生しました",
      error
    );
  }
};
