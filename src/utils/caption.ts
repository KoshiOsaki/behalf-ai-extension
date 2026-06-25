import { CaptionData, CaptionExportData } from "../types";
import {
  findCaptionContainer,
  getCaptionDataList,
  getMeetingTitle,
} from "./scraper";

// テキストを抽出する関数
export const extractText = (element: Element | null): string => {
  if (!element) return "";
  const text = element.textContent?.trim() || "";
  return text;
};

export const getCurrentDate = (): string => {
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
};

// 字幕が表示されるのを監視する関数
export const observePageForCaptionContainer = (callback: () => void): void => {
  // 既に字幕コンテナが存在するか確認
  const existingContainer = findCaptionContainer();
  if (existingContainer) {
    callback();
    return;
  }

  // 字幕コンテナが表示されるのを監視
  const observer = new MutationObserver((mutations) => {
    const captionContainer = findCaptionContainer();
    if (captionContainer) {
      observer.disconnect();
      callback();
    }
  });

  // ドキュメント全体の変更を監視
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 一定時間後にタイムアウト
  setTimeout(() => {
    if (!findCaptionContainer()) {
      observer.disconnect();
    }
  }, 30000); // 30秒後にタイムアウト
};

// 字幕の変更を監視して、変更があればコールバックを実行
export const observeCaptionChanges = (
  callback: (captions: CaptionData[]) => void
): MutationObserver => {
  const captionContainer = findCaptionContainer();
  if (!captionContainer) {
    console.error("Meet Caption Assistant: 字幕コンテナが見つかりません");
    return new MutationObserver(() => {});
  }

  // 前回の字幕データを保存する変数
  let previousCaptions: CaptionData[] = [];

  const syncCaptions = () => {
    try {
      const currentCaptions = getCaptionDataList();
      if (
        currentCaptions.length > 0 &&
        JSON.stringify(currentCaptions) !== JSON.stringify(previousCaptions)
      ) {
        previousCaptions = currentCaptions;
        callback(currentCaptions);
      }
    } catch (error) {
      console.error(
        "Meet Caption Assistant: 字幕データの抽出中にエラーが発生しました",
        error
      );
    }
  };

  // 字幕の変更を監視するオブザーバー
  const observer = new MutationObserver(syncCaptions);

  // 字幕コンテナの変更を監視
  observer.observe(captionContainer, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // observe 開始時点で既に行が存在するケース（Meet 側で先に字幕が出ていた等）に備え、
  // 初回は MutationObserver を待たずに同期する。
  syncCaptions();

  return observer;
};

/**
 * 字幕をマークダウンファイルとしてエクスポートする
 * @param captions 字幕データの配列
 * @param saveAs 保存先を選択するダイアログを表示するかどうか
 */
export const exportCaptionsToMarkdown = (
  captions: CaptionData[],
  saveAs: boolean = false
): void => {
  try {
    if (captions.length === 0) {
      console.warn("Meet Caption Assistant: エクスポートする字幕がありません");
      return;
    }

    const meetingTitle = getMeetingTitle() || "会議";
    const today = getCurrentDate();
    const fileName = `${today}_${meetingTitle}`;

    // 時間ごとにグループ化する（10分間隔）
    const timeGroups: { [key: string]: CaptionExportData[] } = {};

    captions.forEach((caption) => {
      const date = new Date(caption.timestamp);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = Math.floor(date.getMinutes() / 10) * 10;
      const minutesStr = minutes.toString().padStart(2, "0");
      const timeKey = `${hours}:${minutesStr}`;

      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = [];
      }

      timeGroups[timeKey].push({
        speaker: caption.speaker,
        content: caption.text,
        timestamp: date.toISOString(),
      });
    });

    // マークダウンテキストを生成
    let markdownContent = `# ${meetingTitle} - ${today}\n\n`;

    Object.keys(timeGroups)
      .sort()
      .forEach((timeKey) => {
        markdownContent += `\n## ${timeKey}\n \n`;

        timeGroups[timeKey].forEach((item) => {
          markdownContent += `${item.speaker}: ${item.content}\n`;
        });

        markdownContent += "\n \n";
      });

    // バックグラウンドスクリプトにダウンロードリクエストを送信
    chrome.runtime.sendMessage(
      {
        type: "download-markdown",
        data: {
          name: fileName,
          content: markdownContent,
          saveAs: saveAs,
        },
      },
      (response) => {
        if (response && response.error) {
          console.error(
            "Meet Caption Assistant: マークダウンのダウンロード中にエラーが発生しました",
            response.error
          );
        }
      }
    );
  } catch (error) {
    console.error(
      "Meet Caption Assistant: 字幕のエクスポート中にエラーが発生しました",
      error
    );
  }
};
