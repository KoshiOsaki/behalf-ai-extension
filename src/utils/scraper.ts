// Google Meetの字幕をスクレイピングするためのユーティリティ関数

import { CaptionData } from "../types";

// 字幕系キーワード（aria-label の locale 差を吸収する）。
// findCaptionContainer と同じ語彙を使い、判定ロジックを揃える。
const CAPTION_LABEL_KEYWORDS = [
  "字幕",
  "caption",
  "subtitle",
  "sous-titre", // fr
  "untertitel", // de
  "subtítulo", // es
  "legenda", // pt
];

// 「オフにする」系（＝現在オン）を示すキーワード
const CAPTION_OFF_ACTION_KEYWORDS = [
  "オフ",
  "off",
  "désactiver", // fr
  "deaktivieren", // de
  "desactivar", // es
  "desativar", // pt
];

const labelIncludesAny = (label: string, keywords: string[]): boolean =>
  keywords.some((kw) => label.includes(kw));

// 字幕がオンになっているかどうかを判定する
export const isCheckCaptionActive = (): boolean => {
  const captionButton = findCaptionButton();
  if (!captionButton) {
    console.log("Meet Caption Assistant: 字幕ボタンが見つかりません");
    return false;
  }

  // 1) aria-pressed が "true" ならオン
  if (captionButton.getAttribute("aria-pressed") === "true") return true;

  // 2) aria-label が「字幕をオフにする」系（＝押すとオフになる＝今オン）
  const label = captionButton.getAttribute("aria-label")?.toLowerCase() ?? "";
  return labelIncludesAny(label, CAPTION_OFF_ACTION_KEYWORDS);
};

// 字幕オン/オフ用のボタンを検出する。
// 動的な data-tooltip-id や難読化 class には依存せず、
// aria-label の多言語キーワード（部分一致）で拾う。最後に Material icon でフォールバック。
export const findCaptionButton = (): HTMLButtonElement | null => {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button[aria-label]")
  );

  const matchByLabel = buttons.find((btn) => {
    const label = btn.getAttribute("aria-label")?.toLowerCase() ?? "";
    return labelIncludesAny(label, CAPTION_LABEL_KEYWORDS);
  });
  if (matchByLabel) return matchByLabel;

  // フォールバック: closed_caption / closed_caption_off アイコンを内包する button
  const iconHost = document.querySelector<HTMLElement>(
    'button i.google-symbols, button .google-symbols'
  );
  const iconText = iconHost?.textContent?.trim().toLowerCase() ?? "";
  if (iconText.includes("closed_caption")) {
    return iconHost?.closest("button") ?? null;
  }
  return null;
};

// Meet のDOMは難読化・改変されがちなので複数ソースからフォールバックで拾う。
// 全部空振りしたら warn を出して壊れたことに気付けるようにする。
const normalizeTitle = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;
  // "Meet"/"Google Meet" 単体はプレースホルダなので捨てる
  if (/^(google\s+)?meet$/i.test(text)) return null;
  return text;
};

export const getMeetingTitle = (): string | null => {
  // 1) 現行DOM: role="heading" aria-level="1" にミーティング名が入っている
  const heading = document.querySelector<HTMLElement>(
    '[role="heading"][aria-level="1"]'
  );
  const fromHeading = normalizeTitle(heading?.textContent);
  if (fromHeading) return fromHeading;

  // 2) タブタイトル: Meet は "会議名 - Google Meet" / "Meet - 会議名" 形式で入れる
  const fromTitle = normalizeTitle(
    document.title.replace(/\s*[-–—]\s*Google Meet\s*$/i, "")
                  .replace(/^\s*Meet\s*[-–—]\s*/i, "")
  );
  if (fromTitle) return fromTitle;

  // 3) URL 末尾の meeting code (abc-defg-hij) を最終フォールバック
  const codeMatch = location.pathname.match(/([a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4})/i);
  if (codeMatch) return codeMatch[1];

  console.warn("Meet Caption Assistant: ミーティング名を取得できませんでした");
  return null;
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

// 字幕行が初めて現れた時刻（epoch ms）。
// 以前はアバター img の data-iml を使っていたが、あれは「ページ読み込みからの経過ms」
// なので Date に流すと 1970 年扱いになり 09:00:10 のような無意味な表示になっていた。
// 行は発言中に何度も再parseされるので、初回の Date.now() を要素ごとに固定して保持する。
const rowFirstSeenMap = new WeakMap<Element, number>();
const getRowFirstSeenAt = (entry: Element): number => {
  let at = rowFirstSeenMap.get(entry);
  if (at === undefined) {
    at = Date.now();
    rowFirstSeenMap.set(entry, at);
  }
  return at;
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

  return {
    id: getRowId(entry),
    speaker,
    text,
    timestamp: getRowFirstSeenAt(entry),
  };
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
