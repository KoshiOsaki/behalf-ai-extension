/**
 * キャプションデータの型定義
 */
export interface CaptionData {
  /** 字幕行（DOM要素）ごとの安定ID。重複排除のキーに使う */
  id: number;
  speaker: string;
  text: string;
  timestamp: number;
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
 * 字幕データをエクスポート用に整形した型定義
 */
export interface CaptionExportData {
  speaker: string;
  content: string;
  timestamp?: string;
}
