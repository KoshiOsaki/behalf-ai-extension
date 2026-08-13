import React, { useState } from "react";

interface CaptionEnableReminderBannerProps {
  onClose?: () => void;
}

/**
 * 字幕が有効になっていない場合に表示するトースト風通知コンポーネント
 * 見た目はサイドドロワーと同じダークテイストに揃えている
 */
export const CaptionEnableReminderToast: React.FC<
  CaptionEnableReminderBannerProps
> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bai-toast" id="caption-reminder-toast" role="status">
      <div className="bai-toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M3.5 6.75A1.75 1.75 0 0 1 5.25 5h13.5a1.75 1.75 0 0 1 1.75 1.75v10.5A1.75 1.75 0 0 1 18.75 19H5.25a1.75 1.75 0 0 1-1.75-1.75V6.75Z" />
          <path d="M7.5 13.5h3M13.5 13.5h3" />
        </svg>
      </div>
      <div className="bai-toast-body">
        <strong>字幕が見つかりません</strong>
        <span>
          キーボードの <kbd className="bai-kbd">C</kbd> キーを押して字幕を有効にしてください
        </span>
      </div>
      <button className="bai-toast-close" onClick={handleClose} aria-label="閉じる">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m7 7 10 10M17 7 7 17" />
        </svg>
      </button>
    </div>
  );
};
