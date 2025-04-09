// Google Meetの字幕をスクレイピングするためのユーティリティ関数

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

/**
 * 字幕コンテナを見つける関数
 * @returns 字幕コンテナの要素、または見つからない場合はnull
 */
export const findCaptionContainer = (): HTMLElement | null => {
  // 複数の可能性のあるセレクタを試す
  const selectors = [
    "div.YTBDae-Bz112c-8LtmJb", // 以前のセレクタ
    '[aria-label="字幕"]', // ユーザー提供のセレクタ
    ".nMcdL.bj4p3b", // 字幕テキスト要素の親
    ".VfPpkd-gIZYRc", // 別の可能性のあるセレクタ
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      console.log(
        `Meet Caption Assistant: 字幕コンテナが見つかりました (${selector})`
      );
      return element;
    }
  }

  console.log("Meet Caption Assistant: 字幕コンテナが見つかりませんでした");
  return null;
};

/**
 * 字幕コンテナが表示されるのを監視する関数
 * @param callback 字幕コンテナが見つかったときに実行するコールバック関数
 */
export const observePageForCaptionContainer = (callback: () => void): void => {
  console.log("Meet Caption Assistant: 字幕コンテナを監視します");

  // 既に字幕コンテナが存在するか確認
  const existingContainer = findCaptionContainer();
  if (existingContainer) {
    console.log("Meet Caption Assistant: 字幕コンテナが既に存在します");
    callback();
    return;
  }

  // 字幕コンテナが表示されるのを監視
  const observer = new MutationObserver((mutations) => {
    const captionContainer = findCaptionContainer();
    if (captionContainer) {
      console.log("Meet Caption Assistant: 字幕コンテナが見つかりました");
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
      console.log(
        "Meet Caption Assistant: 字幕コンテナが見つかりませんでした（タイムアウト）"
      );
      observer.disconnect();
    }
  }, 30000); // 30秒後にタイムアウト
};

/**
 * 要素からテキストを抽出する関数
 * @param element テキストを抽出する要素
 * @returns 抽出されたテキスト
 */
export const extractText = (element: Element | null): string => {
  if (!element) return "";
  const text = element.textContent?.trim() || "";
  return text;
};

/**
 * 会議のタイトルを取得する関数
 * @returns 会議のタイトル、または取得できない場合はデフォルト値
 */
export const getMeetingTitle = (): string => {
  const selectors = [
    ".gSlHI .u6vdEc", // ユーザー提供のセレクタ
    "[data-meeting-title]",
    ".eFmLfc", // 別の可能性のあるセレクタ
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const title = extractText(element).replace(/\s+/g, "");
      if (title) return title;
    }
  }

  return "Meeting";
};

/**
 * 現在の日付を YYYYMMDD 形式で取得する関数
 * @returns YYYYMMDD 形式の日付文字列
 */
export const getCurrentDate = (): string => {
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
};

/**
 * 字幕の変更を監視する関数
 * @param callback 新しい字幕データが検出されたときに実行するコールバック関数
 * @returns MutationObserverインスタンス
 */
export const observeCaptionChanges = (
  callback: (captions: CaptionData[]) => void
): MutationObserver => {
  const captionContainer = findCaptionContainer();
  if (!captionContainer) {
    console.error("Meet Caption Assistant: 字幕コンテナが見つかりません");
    return new MutationObserver(() => {});
  }

  console.log(
    "Meet Caption Assistant: 字幕の変更を監視します",
    captionContainer
  );

  // 前回の字幕データを保存する変数
  let previousCaptions: CaptionData[] = [];

  // 字幕の変更を監視するオブザーバー
  const observer = new MutationObserver((mutations) => {
    try {
      // 現在の字幕データを取得
      const currentCaptions = extractCaptionData(captionContainer);

      // 前回と異なる場合のみコールバックを実行
      if (
        JSON.stringify(currentCaptions) !== JSON.stringify(previousCaptions) &&
        currentCaptions.length > 0
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
  });

  // 字幕コンテナの変更を監視
  observer.observe(captionContainer, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return observer;
};

/**
 * 字幕コンテナから字幕データを抽出する関数
 * @param container 字幕コンテナ
 * @returns 抽出された字幕データの配列
 */
const extractCaptionData = (container: HTMLElement): CaptionData[] => {
  try {
    // 複数の可能性のあるセレクタを試す
    const selectors = [
      ".VfPpkd-gIZYRc", // 以前のセレクタ
      ".nMcdL.bj4p3b", // ユーザー提供のセレクタ
    ];

    let captionElements: NodeListOf<Element> | null = null;

    // 有効なセレクタを見つける
    for (const selector of selectors) {
      const elements = container.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        captionElements = elements;
        break;
      }
    }

    if (!captionElements || captionElements.length === 0) {
      return [];
    }

    const captions: CaptionData[] = [];

    captionElements.forEach((element) => {
      try {
        // 話者名と字幕テキストを取得するための複数のセレクタを試す
        const speakerSelectors = [
          ".zs7s8d", // 以前のセレクタ
          ".NWpY1d", // ユーザー提供のセレクタ
        ];

        const textSelectors = [
          ".iTTPOb", // 以前のセレクタ
          ".VbkSUe", // ユーザー提供のセレクタ
        ];

        // 話者名を取得
        let speakerElement = null;
        for (const selector of speakerSelectors) {
          speakerElement = element.querySelector(selector);
          if (speakerElement) break;
        }

        // 字幕テキストを取得
        let textElement = null;
        for (const selector of textSelectors) {
          textElement = element.querySelector(selector);
          if (textElement) break;
        }

        const speaker = speakerElement
          ? extractText(speakerElement)
          : "不明な話者";
        const text = textElement ? extractText(textElement) : "";

        if (text) {
          captions.push({
            speaker,
            text,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error(
          "Meet Caption Assistant: 字幕要素の処理中にエラーが発生しました",
          error
        );
      }
    });

    return captions;
  } catch (error) {
    console.error(
      "Meet Caption Assistant: 字幕データの抽出中にエラーが発生しました",
      error
    );
    return [];
  }
};

/**
 * キャプションデータをエクスポート用の形式に変換する関数
 * @param captions 内部形式のキャプションデータ
 * @returns エクスポート用に整形されたキャプションデータ
 */
export const formatCaptionsForExport = (
  captions: CaptionData[]
): CaptionExportData[] => {
  return captions.map((caption) => {
    const timestamp = new Date(caption.timestamp).toISOString();
    return {
      speaker: caption.speaker,
      content: caption.text,
      timestamp,
    };
  });
};

/**
 * キャプションデータをJSONファイルとしてエクスポートする関数
 * @param captions エクスポートするキャプションデータ
 * @param meetingTitle 会議のタイトル（ファイル名に使用）
 * @param date 日付（ファイル名に使用）
 */
export const exportCaptionsToJson = (captions: CaptionData[]): void => {
  try {
    if (captions.length === 0) {
      console.warn("Meet Caption Assistant: エクスポートする字幕がありません");
      return;
    }

    const meetingTitle = getMeetingTitle();
    const today = getCurrentDate();
    const fileName = `${meetingTitle}_${today}.json`;

    const exportData = formatCaptionsForExport(captions);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    console.log(
      `Meet Caption Assistant: 字幕を ${fileName} としてエクスポートしました`
    );
  } catch (error) {
    console.error(
      "Meet Caption Assistant: 字幕のエクスポート中にエラーが発生しました",
      error
    );
  }
};
