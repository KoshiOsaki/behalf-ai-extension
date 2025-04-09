import React, { useState } from "react";

interface CaptionEnableReminderBannerProps {
  onClose?: () => void;
}

/**
 * 字幕が有効になっていない場合に表示するバナーコンポーネント
 */
export const CaptionEnableReminderBanner: React.FC<
  CaptionEnableReminderBannerProps
> = ({ onClose }) => {
  console.log("CaptionEnableReminderBanner");
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  return isVisible ? (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md max-w-md">
      <div className="flex items-center">
        <div>
          <p className="font-bold">字幕が有効になっていません</p>
          <p className="text-sm">
            キーボードの「c」キーを押して字幕を有効にしてください。
          </p>
        </div>
        <button
          onClick={handleClose}
          className="ml-auto text-yellow-500 hover:text-yellow-700"
          aria-label="閉じる"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  ) : null;
};
