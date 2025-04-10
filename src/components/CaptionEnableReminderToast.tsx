import React, { useState } from "react";

interface CaptionEnableReminderBannerProps {
  onClose?: () => void;
}

/**
 * 字幕が有効になっていない場合に表示するトースト風通知コンポーネント
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

  // トーストのスタイル
  const toastStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "160px",
    left: "24px",
    zIndex: 2147483647, // 最大のz-index値
    backgroundColor: "#fef9c3",
    border: "1px solid #f59e0b",
    borderLeft: "4px solid #f59e0b",
    color: "#b45309",
    padding: "12px 16px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    fontFamily: "Roboto, Arial, sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    display: "block",
    maxWidth: "400px",
    borderRadius: "6px",
  };

  const contentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    paddingRight: "24px", // 閉じるボタン用のスペース
  };

  const textStyle: React.CSSProperties = {
    margin: "0",
    fontWeight: "bold",
  };

  const subtextStyle: React.CSSProperties = {
    margin: "4px 0 0 0",
    fontWeight: "normal",
    fontSize: "13px",
  };

  const closeButtonStyle: React.CSSProperties = {
    position: "absolute",
    right: "0",
    top: "0",
    background: "transparent",
    border: "none",
    color: "#b45309",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return isVisible ? (
    <div style={toastStyle} id="caption-reminder-toast">
      <div style={contentStyle}>
        <p style={textStyle}>字幕が見つかりません</p>
        <p style={subtextStyle}>
          キーボードの「c」キーを押して字幕を有効にしてください。
        </p>
        <button
          onClick={handleClose}
          style={closeButtonStyle}
          aria-label="閉じる"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  ) : null;
};
