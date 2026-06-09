// Google Meetの字幕をスクレイピングするためのユーティリティ関数

import { CaptionData } from "../types";

// 字幕がオンになっているかどうかを判定する
export const isCheckCaptionActive = (): boolean => {
  // 字幕ボタンを検索
  const captionButton = findCaptionButton();

  // ボタンが見つからない場合はfalseを返す
  if (!captionButton) {
    console.log("Meet Caption Assistant: 字幕ボタンが見つかりません");
    return false;
  }

  // aria-pressed属性が"true"の場合は字幕がオン
  // aria-label属性が"字幕をオフにする"の場合も字幕がオン
  const isActive =
    captionButton.getAttribute("aria-pressed") === "true" ||
    captionButton.getAttribute("aria-label") === "字幕をオフにする";

  return isActive;
};

export const findCaptionButton = () => {
  // data-tooltip-id が ucc-8 のボタンを取得する
  return document.querySelector('button[data-tooltip-id="ucc-8"]');
};

export const getMeetingTitle = () => {
  const titleElem = document.querySelector("[data-meeting-title]");
  return titleElem ? titleElem.getAttribute("data-meeting-title") : null;
};

export const findCaptionContainer = (): Element | null => {
  // role="region" のうち、aria-label に字幕系キーワードを含むものを探す。
  // 「字幕」/「Captions」の完全一致をやめ、言語UIの違いに依存しないようにする。
  const regions = Array.from(
    document.querySelectorAll('div[role="region"][aria-label]')
  );

  const captionRegion = regions.find((el) => {
    const label = el.getAttribute("aria-label")?.toLowerCase() ?? "";
    return (
      label.includes("字幕") ||
      label.includes("caption") ||
      label.includes("subtitle") ||
      label.includes("sous-titre") || // fr
      label.includes("untertitel") // de
    );
  });

  return captionRegion ?? null;
};

// 字幕行（DOM要素）ごとに安定したIDを振るためのマップ。
// Meet は発言中は同じ要素のテキストを更新し、確定すると新しい行を追加するため、
// 「DOM要素の同一性」を行の同一性とみなせる。timestamp(img依存)に頼らず重複排除できる。
const rowIdMap = new WeakMap<Element, number>();
let rowIdCounter = 0;
const getRowId = (entry: Element): number => {
  let id = rowIdMap.get(entry);
  if (id === undefined) {
    id = rowIdCounter++;
    rowIdMap.set(entry, id);
  }
  return id;
};

// 字幕の各行（エントリー）かどうかを「構造」から判定する。
// class名・id には一切依存しない（Meet の難読化classは変動するため）。
const isCaptionEntry = (entry: Element): boolean => {
  // 「最新の字幕に移動」などの操作ボタンを含む行はUIノイズなので除外
  if (entry.querySelector("button")) return false;

  // テキストを持つ行だけを字幕行とみなす。
  // （非表示のプレースホルダ div 等はテキストが空なので自然に除外される）
  return (entry.textContent?.trim().length ?? 0) > 0;
};

// 1つの字幕行から speaker / text / timestamp を抽出する。
// 「発言者ブロック（アバター or 名前を持つ子）」と「それ以外（＝文字起こし）」を
// 並びから動的に切り分けるので、子要素の位置や数が変わっても壊れない。
const parseCaptionEntry = (entry: Element): CaptionData => {
  const directChildren = Array.from(entry.children);

  // 発言者ブロック = アバターを内包する直下の子。
  // アバターはプロフィール画像(img)のときと、画像未設定/複数人だとアイコン(i)のときがある。
  // どちらも無い瞬間に備え、最終フォールバックとして先頭の子を発言者ブロックとみなす。
  const speakerBlock =
    directChildren.find((child) => child.querySelector("img, i")) ??
    directChildren[0] ??
    null;

  // timestamp はアバター img の data-iml から取得（アイコン表示など取れなければ 0）
  const img = speakerBlock?.querySelector<HTMLImageElement>("img[data-iml]");
  const timestamp = img?.dataset.iml ? parseFloat(img.dataset.iml) : 0;

  // 発言者名 = 発言者ブロック内の最初の span
  const speaker =
    speakerBlock?.querySelector("span")?.textContent?.trim() ?? "";

  // 文字起こし = 発言者ブロック以外の直下の子のテキストを連結。
  // 「2番目の子」決め打ちをやめ、テキスト要素が複数/位置違いでも拾う。
  const text = directChildren
    .filter((child) => child !== speakerBlock)
    .map((child) => child.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();

  return { id: getRowId(entry), speaker, text, timestamp };
};

// 字幕データの中身を取得する
export const getCaptionDataList = (): CaptionData[] => {
  // 「字幕」とラベル付けされた領域を取得
  const captionRegion = findCaptionContainer();
  if (!captionRegion) {
    console.log("Meet Caption Assistant: 字幕領域が見つかりません");
    return [];
  }

  // 直下の div を走査し、構造から字幕行だけを選ぶ。
  // 行の同一性は id(DOM要素ベース)で担保するので、timestamp の有無で足切りしない。
  return Array.from(captionRegion.querySelectorAll(":scope > div"))
    .filter(isCaptionEntry)
    .map(parseCaptionEntry)
    .filter((caption) => caption.text.length > 0);
};
