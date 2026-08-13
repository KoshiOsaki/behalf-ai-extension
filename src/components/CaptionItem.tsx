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
      className={`bai-caption-item ${isHighlighted ? "bai-caption-item--highlighted" : ""}`}
    >
      <span className="bai-timeline-dot" aria-hidden="true" />
      <div className="bai-caption-meta">
        <span className="bai-caption-speaker">{speaker}</span>
        <span className="bai-caption-time">
          {formatTime(timestamp)}
        </span>
      </div>
      <p className="bai-caption-text">{text}</p>
    </div>
  );
};

export default CaptionItem;
