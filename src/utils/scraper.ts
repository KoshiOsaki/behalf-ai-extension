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

export const findCaptionContainer = () => {
  // パターン1: role="region" と aria-label="字幕" を持つ要素
  const captionByRole = document.querySelector(
    'div[role="region"][aria-label="字幕"]'
  );
  if (captionByRole) return captionByRole;

  // パターン2: 英語環境の場合 - role="region" と aria-label="Captions" を持つ要素
  const captionByRoleEn = document.querySelector(
    'div[role="region"][aria-label="Captions"]'
  );
  if (captionByRoleEn) return captionByRoleEn;

  return null;
};

// 字幕データの中身を取得する
export const getCaptionDataList = (): CaptionData[] => {
  // 「字幕」とラベル付けされた領域を取得
  const captionRegion = findCaptionContainer();
  if (!captionRegion) {
    console.log("Meet Caption Assistant: 字幕領域が見つかりません");
    return [];
  }

  // ここでは、直下の子要素で、内部に img[data-iml] を含むものを字幕のエントリーとみなす
  const entries = Array.from(
    captionRegion.querySelectorAll(":scope > div")
  ).filter((entry) => entry.querySelector("img[data-iml]"));

  // 各エントリーから CaptionData を抽出
  const captionDataArray = entries.map((entry) => {
    // 画像要素の data-iml 属性から timestamp を取得
    const img = entry.querySelector("img[data-iml]");
    const timestampStr = img ? img.getAttribute("data-iml") : "";
    const timestamp = timestampStr ? parseFloat(timestampStr) : 0;

    // 発言者は、画像要素の親要素内にある最初の span 要素とする
    const speakerElem =
      img && img.parentElement ? img.parentElement.querySelector("span") : null;
    const speaker = speakerElem ? speakerElem.textContent?.trim() : "";

    // 字幕の文章は、ここではエントリー内の直下の子要素の２番目（発言者部以外の部分）を利用
    let text = "";
    const children = Array.from(entry.children);
    if (children.length >= 2) {
      text = children[1].textContent?.trim() || "";
    } else {
      // 万が一直下の子要素が1つの場合は、全体のテキストから発言者部分を除去するなどの処理を追加するなどの工夫が必要
      text = entry.textContent?.trim() || "";
    }

    return { speaker: speaker || "", text, timestamp };
  });

  return captionDataArray;
};
