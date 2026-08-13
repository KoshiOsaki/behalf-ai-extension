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

// 字幕領域のライフサイクルを監視する。
// Meet は字幕のトグルやレイアウト変更で region ノードを丸ごと作り直すことがあり、
// 一度だけ region に貼った MutationObserver は静かに死んで「取れないとき」が生まれる。
// ここでは region 本体（内容変化）と region の親（region 差し替え）の 2 層で観測し、
// 差し替わったら自動的に貼り直す。region がまだ無い間だけ body subtree を張る。
export const observeCaptionLifecycle = (
  callback: (captions: CaptionData[]) => void
): (() => void) => {
  let contentObserver: MutationObserver | null = null;
  let parentObserver: MutationObserver | null = null;
  let bodyObserver: MutationObserver | null = null;
  let healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  let currentRegion: Element | null = null;
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
        "Gijiro: 字幕データの抽出中にエラーが発生しました",
        error
      );
    }
  };

  const detachContentObservers = () => {
    contentObserver?.disconnect();
    contentObserver = null;
    parentObserver?.disconnect();
    parentObserver = null;
  };

  const handleRegionLost = () => {
    detachContentObservers();
    currentRegion = null;
    waitForRegion();
  };

  // MutationObserver が取りこぼす祖先差し替え・silent detach への保険。
  // 低頻度ポーリングで region の生死と最新性を再チェックする。
  const startHealthCheck = () => {
    if (healthCheckTimer) return;
    healthCheckTimer = setInterval(() => {
      if (!currentRegion) return;
      if (!currentRegion.isConnected) {
        handleRegionLost();
        return;
      }
      const latest = findCaptionContainer();
      if (latest && latest !== currentRegion) {
        detachContentObservers();
        bindToRegion(latest);
        return;
      }
      // observer が発火し損ねているケースの救済
      syncCaptions();
    }, 2000);
  };

  const stopHealthCheck = () => {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
  };

  const bindToRegion = (region: Element) => {
    currentRegion = region;

    contentObserver = new MutationObserver(syncCaptions);
    contentObserver.observe(region, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // region の親 childList のみ監視。Meet が region を差し替えた／取り外した
    // タイミングだけ発火するので、subtree を張るより桁違いに軽い。
    const parent = region.parentElement;
    if (parent) {
      parentObserver = new MutationObserver(() => {
        if (!region.isConnected) {
          handleRegionLost();
          return;
        }
        // 同じ親配下で新しい region に差し替わったケース
        const latest = findCaptionContainer();
        if (latest && latest !== currentRegion) {
          detachContentObservers();
          bindToRegion(latest);
        }
      });
      parentObserver.observe(parent, { childList: true });
    }

    syncCaptions();
    startHealthCheck();
  };

  const waitForRegion = () => {
    const existing = findCaptionContainer();
    if (existing) {
      bindToRegion(existing);
      return;
    }
    bodyObserver?.disconnect();
    bodyObserver = new MutationObserver(() => {
      const region = findCaptionContainer();
      if (region) {
        bodyObserver?.disconnect();
        bodyObserver = null;
        bindToRegion(region);
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  };

  waitForRegion();

  return () => {
    detachContentObservers();
    bodyObserver?.disconnect();
    bodyObserver = null;
    stopHealthCheck();
    currentRegion = null;
  };
};

/**
 * 字幕からマークダウン本文とファイル名を生成する
 * @returns 字幕が空の場合は null
 */
export const buildCaptionsMarkdown = (
  captions: CaptionData[]
): { fileName: string; content: string } | null => {
  if (captions.length === 0) return null;

  const today = getCurrentDate();
  const meetingTitle = getMeetingTitle() ?? "meeting";
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

  return { fileName, content: markdownContent };
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
    const markdown = buildCaptionsMarkdown(captions);
    if (!markdown) {
      console.warn("Gijiro: エクスポートする字幕がありません");
      return;
    }

    // バックグラウンドスクリプトにダウンロードリクエストを送信
    chrome.runtime.sendMessage(
      {
        type: "download-markdown",
        data: {
          name: markdown.fileName,
          content: markdown.content,
          saveAs: saveAs,
        },
      },
      (response) => {
        if (response && response.error) {
          console.error(
            "Gijiro: マークダウンのダウンロード中にエラーが発生しました",
            response.error
          );
        }
      }
    );
  } catch (error) {
    console.error(
      "Gijiro: 字幕のエクスポート中にエラーが発生しました",
      error
    );
  }
};

/**
 * 字幕をマークダウン形式でクリップボードにコピーする
 * @returns コピーに成功したかどうか
 */
export const copyCaptionsToClipboard = async (
  captions: CaptionData[]
): Promise<boolean> => {
  const markdown = buildCaptionsMarkdown(captions);
  if (!markdown) return false;

  try {
    await navigator.clipboard.writeText(markdown.content);
    return true;
  } catch (error) {
    // Meet 側のフォーカス状態などで Clipboard API が失敗することがあるため、
    // 旧来の execCommand にフォールバックする。
    try {
      const textarea = document.createElement("textarea");
      textarea.value = markdown.content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch (fallbackError) {
      console.error("Gijiro: クリップボードへのコピーに失敗しました", fallbackError);
      return false;
    }
  }
};
