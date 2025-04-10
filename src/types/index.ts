/**
 * キャプションデータの型定義
 */
export interface CaptionData {
  speaker: string;
  text: string;
  timestamp: number;
}

/**
 * サイドドロワーのプロパティ
 */
export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * キャプションアイテムのプロパティ
 */
export interface CaptionItemProps {
  speaker: string;
  text: string;
  timestamp: number;
  isHighlighted?: boolean;
}

/**
 * キャプションリストのプロパティ
 */
export interface CaptionsListProps {
  captions: CaptionData[];
  highlightedCaptionId?: number;
}

/**
 * 字幕データの型定義
 */
export interface CaptionData {
  speaker: string;
  text: string;
  timestamp: number;
}

/**
 * 字幕データをエクスポート用に整形した型定義
 */
export interface CaptionExportData {
  speaker: string;
  content: string;
  timestamp?: string;
}
