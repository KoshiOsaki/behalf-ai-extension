import React, { useEffect, useRef } from "react";
import { CaptionData } from "../types";
import { exportCaptionsToMarkdown } from "../utils/caption";

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
              エクスポート
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideDrawer;
