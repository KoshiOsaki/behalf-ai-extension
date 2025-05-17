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

/**
 * 折りたたみ可能なサイドドロワーコンポーネント
 * Google Meetのページに表示される字幕履歴を表示するためのドロワー
 */
const SideDrawer: React.FC<Props> = ({
  captions,
  isOpen,
  onClose,
  children,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [apiKeyExists, setApiKeyExists] = useState<boolean>(false);
  const [showApiKeyInfo, setShowApiKeyInfo] = useState<boolean>(false);
  const [notionSettings, setNotionSettings] = useState<{
    secret: string;
    databaseId: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 発言候補を生成する関数
  const handleGenerateSuggestions = async () => {
    if (!showSuggestions) {
      setShowSuggestions(true);
      setIsLoadingSuggestions(true);

      try {
        // 発言候補を生成
        const generatedSuggestions = await generateSuggestions(captions);
        setSuggestions(generatedSuggestions);
      } catch (error) {
        console.error("発言候補の生成中にエラーが発生しました:", error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // APIキー情報表示の切り替え
  const toggleApiKeyInfo = () => {
    setShowApiKeyInfo(!showApiKeyInfo);
  };

  // ドロワーの外側をクリックした時に閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESCキーを押した時に閉じる処理
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  // APIキーとNotion設定の存在確認
  useEffect(() => {
    const checkSettings = async () => {
      const storage = await chrome.storage.local.get([
        "geminiApiKey",
        "notion",
      ]);
      setApiKeyExists(!!storage.geminiApiKey);
      setNotionSettings(storage.notion || null);
    };

    // 初期確認
    checkSettings();

    // ストレージの変更を監視
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local") {
        if (changes.geminiApiKey) {
          // APIキーが変更された場合
          setApiKeyExists(!!changes.geminiApiKey.newValue);
          // APIキーが設定された場合、情報表示を閉じる
          if (changes.geminiApiKey.newValue) {
            setShowApiKeyInfo(false);
          }
        }

        if (changes.notion) {
          // Notion設定が変更された場合
          setNotionSettings(changes.notion.newValue || null);
        }
      }
    };

    // イベントリスナーを追加
    chrome.storage.onChanged.addListener(handleStorageChange);

    // クリーンアップ関数
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100%",
        width: "350px",
        backgroundColor: "white",
        boxShadow: "-2px 0 10px rgba(0, 0, 0, 0.1)",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease-in-out",
        zIndex: 9999,
      }}
      ref={drawerRef}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#1f2937",
            }}
          >
            字幕履歴
          </h2>
          <button
            onClick={onClose}
            style={{
              color: "#6b7280",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: "0.5rem",
            }}
            aria-label="閉じる"
          >
            <svg
              style={{ width: "1.25rem", height: "1.25rem" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 発言候補を表示ボタン */}
        <div
          style={{
            padding: "0.5rem 1rem",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div>
            <button
              onClick={
                apiKeyExists
                  ? handleGenerateSuggestions
                  : () => {
                      // コンテンツスクリプトからはopenOptionsPageに直接アクセスできないため、
                      // メッセージパッシングを使用してバックグラウンドスクリプトに要求を送信
                      chrome.runtime.sendMessage({ type: "open-options-page" });
                    }
              }
              style={{
                padding: "0.5rem 1rem",
                marginTop: "0.5rem",
                backgroundColor: apiKeyExists ? "#f3f4f6" : "#f3f4f6",
                color: apiKeyExists ? "#4b5563" : "#9ca3af",
                borderRadius: "0.25rem",
                border: "none",
                cursor: apiKeyExists ? "pointer" : "default",
                transition: "background-color 0.2s",
                opacity: apiKeyExists ? 1 : 0.7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
              onMouseOver={(e) => {
                if (apiKeyExists) {
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                }
              }}
              onMouseOut={(e) => {
                if (apiKeyExists) {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }
              }}
              disabled={!apiKeyExists}
            >
              <span>発言候補を表示</span>
              {isLoadingSuggestions && (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    display: "inline-block",
                    width: "1rem",
                    height: "1rem",
                    borderRadius: "50%",
                    border: "2px solid #e5e7eb",
                    borderTopColor: "#3b82f6",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
              {!apiKeyExists && (
                <svg
                  style={{
                    marginLeft: "0.5rem",
                    width: "1rem",
                    height: "1rem",
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </button>

            {!apiKeyExists && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "0.375rem",
                  border: "1px solid #bae6fd",
                  fontSize: "0.75rem",
                  color: "#0c4a6e",
                  lineHeight: 1.5,
                }}
              >
                <p style={{ marginBottom: "0.5rem" }}>
                  発言候補を表示するには、Gemini APIキーの設定が必要です。
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={() => {
                      // コンテンツスクリプトからはopenOptionsPageに直接アクセスできないため、
                      // メッセージパッシングを使用してバックグラウンドスクリプトに要求を送信
                      chrome.runtime.sendMessage({ type: "open-options-page" });
                    }}
                    style={{
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "#0284c7",
                      color: "white",
                      borderRadius: "0.25rem",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  >
                    設定ページを開く
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 発言候補のポップオーバー */}
        {showSuggestions && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                color: "#4b5563",
              }}
            >
              あなたの発言候補
            </h3>
            <div>
              {suggestions.length > 0 ? (
                suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "0.25rem",
                      marginBottom: "0.5rem",
                      cursor: "pointer",
                      border: "1px solid #e5e7eb",
                    }}
                    onClick={() => {
                      // クリップボードにコピー
                      navigator.clipboard.writeText(suggestion);
                      // コピー後にポップオーバーを閉じる
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "0.25rem",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  {isLoadingSuggestions
                    ? "候補を生成中..."
                    : "発言候補を生成できませんでした"}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
          }}
        >
          {children}
        </div>

        <div
          style={{
            padding: "1rem",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <button
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                borderRadius: "0.25rem",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => {
                exportCaptionsToMarkdown(captions);
              }}
            >
              Markdownダウンロード
            </button>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: notionSettings ? "#4f46e5" : "#9ca3af",
                  color: "white",
                  borderRadius: "0.25rem",
                  border: "none",
                  cursor: notionSettings ? "pointer" : "not-allowed",
                  opacity: notionSettings ? 1 : 0.7,
                }}
                disabled={!notionSettings}
                title={
                  notionSettings
                    ? "Notionにエクスポート"
                    : "Notion連携が未設定です"
                }
                onClick={() => {
                  if (!notionSettings) return;

                  setIsExporting(true);
                  setExportStatus(null);

                  // 会議タイトルを取得（例: ページタイトルから）
                  const meetingTitle =
                    document.title ||
                    "会議_" + new Date().toISOString().split("T")[0];

                  chrome.runtime.sendMessage(
                    {
                      type: "NOTION_EXPORT",
                      payload: { captions, meetingTitle },
                    },
                    (res) => {
                      setIsExporting(false);
                      if (res.ok) {
                        setExportStatus({
                          success: true,
                          message: "Notionに保存しました",
                        });
                      } else {
                        setExportStatus({
                          success: false,
                          message: `失敗: ${res.error}`,
                        });
                      }

                      // 5秒後にステータスをクリア
                      setTimeout(() => {
                        setExportStatus(null);
                      }, 5000);
                    }
                  );
                }}
              >
                {isExporting ? "保存中..." : "Notionエクスポート"}
              </button>
              
              {!notionSettings && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  <button
                    onClick={() => {
                      chrome.runtime.sendMessage({ type: "open-options-page" });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#4f46e5",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                    }}
                  >
                    Notion連携を設定する
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* エクスポートステータスの表示 */}
          {exportStatus && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem",
                backgroundColor: exportStatus.success ? "#ecfdf5" : "#fef2f2",
                borderRadius: "0.25rem",
                color: exportStatus.success ? "#065f46" : "#991b1b",
                fontSize: "0.875rem",
                textAlign: "center",
              }}
            >
              {exportStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SideDrawer;
