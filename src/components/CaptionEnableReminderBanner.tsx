import React, { useState, useEffect } from "react";

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

  // コンポーネントがマウントされたときにbodyにスタイルを追加
  useEffect(() => {
    // バナーが表示されている間はbodyのmargin-topを追加
    const originalMarginTop = document.body.style.marginTop;
    document.body.style.marginTop = "60px";

    return () => {
      // クリーンアップ時に元に戻す
      document.body.style.marginTop = originalMarginTop;
    };
  }, []);

  // バナーのスタイル
  const bannerStyle: React.CSSProperties = {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: 2147483647, // 最大のz-index値
    backgroundColor: "#fef9c3",
    borderBottom: "4px solid #f59e0b",
    color: "#b45309",
    padding: "12px 16px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    fontFamily: "Roboto, Arial, sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    display: "block",
    width: "100%",
    textAlign: "center",
  };

  const contentStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "800px",
    margin: "0 auto",
    position: "relative",
  };

  const textStyle: React.CSSProperties = {
    margin: "0",
    fontWeight: "bold",
  };

  const subtextStyle: React.CSSProperties = {
    margin: "0 0 0 8px",
    fontWeight: "normal",
  };

  const closeButtonStyle: React.CSSProperties = {
    position: "absolute",
    right: "0",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "#b45309",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return isVisible ? (
    <div style={bannerStyle} id="caption-reminder-banner">
      <div style={contentStyle}>
        <p style={textStyle}>
          字幕が見つかりません。字幕がONになっているかを確認してください
          <span style={subtextStyle}>
            キーボードの「c」キーを押して字幕を有効にしてください。
          </span>
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
