import React, { useEffect, useRef, useState } from "react";
import { CaptionData } from "../types";
import { exportCaptionsToMarkdown } from "../utils/caption";
import { generateSuggestions } from "../utils/suggestionGenerator";

type Props = {
  captions: CaptionData[];
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const SparklesIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 3.4c.5 3.3 2.3 5.1 5.6 5.6-3.3.5-5.1 2.3-5.6 5.6-.5-3.3-2.3-5.1-5.6-5.6 3.3-.5 5.1-2.3 5.6-5.6Z" />
    <path d="M18.2 14.6c.25 1.7 1.2 2.65 2.9 2.9-1.7.25-2.65 1.2-2.9 2.9-.25-1.7-1.2-2.65-2.9-2.9 1.7-.25 2.65-1.2 2.9-2.9ZM5.2 3.1c.2 1.25.9 1.95 2.15 2.15C6.1 5.45 5.4 6.15 5.2 7.4 5 6.15 4.3 5.45 3.05 5.25 4.3 5.05 5 4.35 5.2 3.1Z" />
  </svg>
);

const DownloadIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18.5h14" />
  </svg>
);

const FolderIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M3.5 7.5h6l1.8 2H20.5v8.75a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75V7.5Zm0 0V5.75C3.5 4.78 4.28 4 5.25 4h4.1l1.8 2H18" />
  </svg>
);

const ExportIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M14 4h6v6m0-6-9 9" />
    <path d="M18 13v5.25A1.75 1.75 0 0 1 16.25 20H5.75A1.75 1.75 0 0 1 4 18.25V7.75A1.75 1.75 0 0 1 5.75 6H11" />
  </svg>
);

/** Google Meetの会話ログを表示するサイドパネル */
const SideDrawer: React.FC<Props> = ({ captions, isOpen, onClose, children }) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [apiKeyExists, setApiKeyExists] = useState(false);
  const [notionSettings, setNotionSettings] = useState<{
    secret: string;
    databaseId: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const openOptionsPage = () => {
    chrome.runtime.sendMessage({ type: "open-options-page" });
  };

  const handleGenerateSuggestions = async () => {
    if (showSuggestions) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);
    setIsLoadingSuggestions(true);

    try {
      const generatedSuggestions = await generateSuggestions(captions);
      setSuggestions(generatedSuggestions);
    } catch (error) {
      console.error("発言候補の生成中にエラーが発生しました:", error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (isOpen) document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    const checkSettings = async () => {
      const storage = await chrome.storage.local.get(["geminiApiKey", "notion"]);
      setApiKeyExists(!!storage.geminiApiKey);
      setNotionSettings(storage.notion || null);
    };

    checkSettings();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (changes.geminiApiKey) setApiKeyExists(!!changes.geminiApiKey.newValue);
      if (changes.notion) setNotionSettings(changes.notion.newValue || null);
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleNotionExport = () => {
    if (!notionSettings) return;

    setIsExporting(true);
    setExportStatus(null);
    const meetingTitle =
      document.title || "会議_" + new Date().toISOString().split("T")[0];

    chrome.runtime.sendMessage(
      {
        type: "NOTION_EXPORT",
        payload: { captions, meetingTitle },
      },
      (res) => {
        setIsExporting(false);
        setExportStatus(
          res.ok
            ? { success: true, message: "Notionに保存しました" }
            : { success: false, message: `失敗: ${res.error}` }
        );
        setTimeout(() => setExportStatus(null), 5000);
      }
    );
  };

  return (
    <aside
      ref={drawerRef}
      className={`bai-drawer ${isOpen ? "bai-drawer--open" : ""}`}
      aria-hidden={!isOpen}
    >
      <header className="bai-header">
        <div className="bai-heading">
          <div className="bai-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <h2>会話ログ</h2>
            <div className="bai-live-meta">
              <span className="bai-live-dot" />
              <span>LIVE</span>
              <span className="bai-meta-separator">·</span>
              <span>{captions.length}件</span>
            </div>
          </div>
        </div>
        <button className="bai-icon-button" onClick={onClose} aria-label="閉じる">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>
      </header>

      <section className="bai-ai-section">
        <div className="bai-ai-icon">
          <SparklesIcon />
        </div>
        <div className="bai-ai-copy">
          <strong>次の発言を考える</strong>
          <span>
            {apiKeyExists
              ? "会話の流れから2つ提案します"
              : "Gemini APIキーを設定すると使えます"}
          </span>
        </div>
        <button
          className={`bai-small-button ${apiKeyExists ? "bai-small-button--accent" : ""}`}
          onClick={apiKeyExists ? handleGenerateSuggestions : openOptionsPage}
          disabled={isLoadingSuggestions}
        >
          {isLoadingSuggestions ? "生成中" : apiKeyExists ? (showSuggestions ? "閉じる" : "生成") : "設定"}
        </button>
      </section>

      {showSuggestions && (
        <section className="bai-suggestions" aria-live="polite">
          <div className="bai-section-label">SUGGESTIONS</div>
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="bai-suggestion-card"
                onClick={() => {
                  navigator.clipboard.writeText(suggestion);
                  setShowSuggestions(false);
                }}
              >
                <span>{suggestion}</span>
                <span className="bai-copy-label">COPY</span>
              </button>
            ))
          ) : (
            <div className="bai-suggestion-empty">
              {isLoadingSuggestions ? "会話を読み取っています…" : "候補を生成できませんでした"}
            </div>
          )}
        </section>
      )}

      <div className="bai-scroll-area">{children}</div>

      <footer className="bai-footer">
        <div className="bai-footer-heading">
          <span>EXPORT</span>
          {exportStatus && (
            <span className={exportStatus.success ? "bai-status--success" : "bai-status--error"}>
              {exportStatus.message}
            </span>
          )}
        </div>
        <div className="bai-export-actions">
          <button className="bai-export-button bai-export-button--primary" onClick={() => exportCaptionsToMarkdown(captions, false)}>
            <DownloadIcon />
            <span>Markdown</span>
          </button>
          <button className="bai-export-button" onClick={() => exportCaptionsToMarkdown(captions, true)} title="保存先を選択してダウンロードします">
            <FolderIcon />
            <span>保存先…</span>
          </button>
          <button
            className="bai-export-button"
            disabled={!notionSettings || isExporting}
            onClick={handleNotionExport}
            title={notionSettings ? "Notionにエクスポート" : "Notion連携が未設定です"}
          >
            <ExportIcon />
            <span>{isExporting ? "保存中" : "Notion"}</span>
          </button>
        </div>
        {!notionSettings && (
          <button className="bai-settings-link" onClick={openOptionsPage}>
            Notion連携を設定
          </button>
        )}
      </footer>
    </aside>
  );
};

export default SideDrawer;
