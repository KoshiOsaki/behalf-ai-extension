import React from "react";
import { CaptionsListProps, CaptionData } from "../types";
import CaptionItem from "./CaptionItem";

/**
 * スクロール可能なキャプション履歴リストを表示するコンポーネント
 */
const CaptionsList: React.FC<CaptionsListProps> = ({
  captions,
  highlightedCaptionId,
}) => {
  // キャプションがない場合の表示
  if (captions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg
          className="w-12 h-12 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-center">
          まだキャプションがありません。
          <br />
          会議が始まると、ここに字幕が表示されます。
        </p>
      </div>
    );
  }

  return (
    <div className="bai-caption-list">
      {captions.map((caption: CaptionData, index: number) => (
        <CaptionItem
          key={`${caption.timestamp}-${index}`}
          speaker={caption.speaker}
          text={caption.text}
          timestamp={caption.timestamp}
          isHighlighted={highlightedCaptionId === index}
        />
      ))}
    </div>
  );
};

export default CaptionsList;
