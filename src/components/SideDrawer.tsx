import React, { useEffect, useRef, useState } from "react";
import { CaptionData } from "../types";
import { copyCaptionsToClipboard, exportCaptionsToMarkdown } from "../utils/caption";

type Props = {
  captions: CaptionData[];
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

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

const CopyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M9 9V5.75C9 4.78 9.78 4 10.75 4h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75H15" />
    <path d="M4 10.75C4 9.78 4.78 9 5.75 9h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75h-7.5C4.78 20 4 19.22 4 18.25v-7.5Z" />
  </svg>
);

const AlertIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 4.5 21 19.5H3L12 4.5Z" />
    <path d="M12 10v4m0 2.6v.4" />
  </svg>
);

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Google Meetの会話ログを表示するサイドパネル */
const SideDrawer: React.FC<Props> = ({ captions, isOpen, onClose, children }) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [notionSettings, setNotionSettings] = useState<{
    secret: string;
    databaseId: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      if (exportStatusTimer.current) clearTimeout(exportStatusTimer.current);
    };
  }, []);

  const handleCopyAll = async () => {
    const success = await copyCaptionsToClipboard(captions);
    setExportStatus({
      success,
      message: success ? "コピーしました" : "コピーできませんでした",
    });
    setIsCopied(success);
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    copyResetTimer.current = setTimeout(() => setIsCopied(false), 2000);
    if (exportStatusTimer.current) clearTimeout(exportStatusTimer.current);
    exportStatusTimer.current = setTimeout(
      () => setExportStatus(null),
      success ? 2000 : 8000
    );
  };

  // 保存先ダイアログでのキャンセルは失敗ではないので通知を出さない
  const isUserCanceled = (error?: string) =>
    !!error && /USER_CANCELED|canceled/i.test(error);

  const handleMarkdownExport = async (saveAs: boolean) => {
    if (exportStatusTimer.current) clearTimeout(exportStatusTimer.current);
    setExportStatus(null);
    setIsDownloading(true);

    const result = await exportCaptionsToMarkdown(captions, saveAs);

    setIsDownloading(false);
    if (isUserCanceled(result.error)) return;

    setExportStatus(
      result.success
        ? { success: true, message: "ダウンロードしました" }
        : { success: false, message: `失敗: ${result.error ?? "不明なエラー"}` }
    );
    exportStatusTimer.current = setTimeout(
      () => setExportStatus(null),
      result.success ? 3000 : 8000
    );
  };

  const openOptionsPage = () => {
    chrome.runtime.sendMessage({ type: "open-options-page" });
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

  // secret / databaseId のどちらかが空なら未設定扱いにする
  // （旧バージョンは空文字のオブジェクトを保存していたため、その残骸も弾く）
  const normalizeNotionSettings = (
    value: { secret?: string; databaseId?: string } | undefined | null
  ) => (value?.secret && value?.databaseId
    ? { secret: value.secret, databaseId: value.databaseId }
    : null);

  useEffect(() => {
    const checkSettings = async () => {
      const storage = await chrome.storage.local.get(["notion"]);
      setNotionSettings(normalizeNotionSettings(storage.notion));
    };

    checkSettings();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (changes.notion)
        setNotionSettings(normalizeNotionSettings(changes.notion.newValue));
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleNotionExport = () => {
    if (!notionSettings) return;

    if (exportStatusTimer.current) clearTimeout(exportStatusTimer.current);
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
        const error = chrome.runtime.lastError?.message || res?.error;
        const ok = !error && res?.ok;
        setExportStatus(
          ok
            ? { success: true, message: "Notionに保存しました" }
            : { success: false, message: `失敗: ${error ?? "不明なエラー"}` }
        );
        exportStatusTimer.current = setTimeout(
          () => setExportStatus(null),
          ok ? 3000 : 8000
        );
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
            <h2>Gijiro</h2>
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

      <div className="bai-scroll-area">{children}</div>

      <footer className="bai-footer">
        <div className="bai-footer-heading">
          <span>EXPORT</span>
          {exportStatus?.success && (
            <span className="bai-status--success">{exportStatus.message}</span>
          )}
        </div>
        {exportStatus && !exportStatus.success && (
          <div className="bai-export-error" role="alert">
            <AlertIcon />
            <span>{exportStatus.message}</span>
          </div>
        )}
        <div className="bai-export-actions">
          <button
            className="bai-export-button bai-export-button--primary"
            onClick={() => handleMarkdownExport(false)}
            disabled={isDownloading || captions.length === 0}
          >
            <DownloadIcon />
            <span>{isDownloading ? "保存中" : "Markdown"}</span>
          </button>
          <button
            className="bai-export-button"
            onClick={() => handleMarkdownExport(true)}
            disabled={isDownloading || captions.length === 0}
            aria-label="保存先を選択してダウンロード"
            data-tooltip="保存先を選択してダウンロード"
          >
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
          <button
            className="bai-export-button bai-export-button--icon"
            onClick={handleCopyAll}
            disabled={captions.length === 0}
            aria-label="すべてMarkdownでコピー"
            data-tooltip="すべてMarkdownでコピー"
          >
            {isCopied ? <CheckIcon /> : <CopyIcon />}
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
