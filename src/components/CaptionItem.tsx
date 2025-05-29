import React from "react";
import { CaptionItemProps } from "../types";

/**
 * 個別のキャプションアイテムを表示するコンポーネント
 */
const CaptionItem: React.FC<CaptionItemProps> = ({
  speaker,
  text,
  timestamp,
  isHighlighted = false,
}) => {
  // タイムスタンプをフォーマットする
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      className={`mb-4 p-3 rounded-lg ${
        isHighlighted
          ? "bg-blue-50 border-l-4 border-blue-500"
          : "bg-gray-50 hover:bg-gray-100"
      } transition-colors duration-200`}
      style={{
        marginBottom: "1rem",
        padding: "0.75rem",
        borderRadius: "0.5rem",
        backgroundColor: isHighlighted ? "#eff6ff" : "#f9fafb",
        borderLeft: isHighlighted ? "4px solid #3b82f6" : "none",
        transition: "background-color 0.2s",
      }}
    >
      <div
        className="flex justify-between items-start mb-1"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.25rem",
        }}
      >
        <span
          className="font-semibold text-gray-800"
          style={{
            fontWeight: 600,
            color: "#1f2937",
          }}
        >
          {speaker}
        </span>
        <span
          className="text-xs text-gray-500"
          style={{
            fontSize: "0.75rem",
            color: "#6b7280",
          }}
        >
          {formatTime(timestamp)}
        </span>
      </div>
      <p
        className="text-gray-700 whitespace-pre-wrap break-words"
        style={{
          color: "#4b5563",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          userSelect: "text", // テキスト選択を明示的に許可
          cursor: "text", // テキスト選択時のカーソルを表示
        }}
      >
        {text}
      </p>
    </div>
  );
};

export default CaptionItem;
