import { CaptionData } from "../types";

export const sanitizeFilename = (filename: string): string => {
  // Windows、macOS、Linuxで使用できない文字を除去
  // \ / : * ? " < > | および制御文字
  return filename.replace(/[\\/:*?"<>|\x00-\x1F]/g, "_");
};

export const groupBy10min = (
  captions: CaptionData[]
): Record<string, CaptionData[]> => {
  const grouped: Record<string, CaptionData[]> = {};

  for (const caption of captions) {
    // タイムスタンプから時間を抽出（例: '09:30'）
    const date = new Date(caption.timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // 10分単位に丸める
    const roundedMinutes = Math.floor(minutes / 10) * 10;
    // フォーマットされた時間（例: '09:30'）
    const formattedTime = `${hours.toString().padStart(2, "0")}:${roundedMinutes
      .toString()
      .padStart(2, "0")}`;

    if (!grouped[formattedTime]) {
      grouped[formattedTime] = [];
    }

    grouped[formattedTime].push(caption);
  }

  return grouped;
};

export const downloadMarkdown = async (
  name: string,
  content: string,
  saveAs: boolean = false
): Promise<{ success: boolean; error?: string; filePath?: string }> => {
  try {
    // データ URLを作成（サービスワーカーではBlobとURL.createObjectURLが使えないため）
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    // 全バイトを一度に引数展開すると、長い議事録で
    // RangeError: Maximum call stack size exceeded になるためチャンクに分ける
    const CHUNK_SIZE = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
    }
    const base64Data = btoa(binary);
    const dataUrl = `data:text/markdown;base64,${base64Data}`;

    // ファイル名を設定（デフォルトはDownloadsフォルダに保存）
    // 無効な文字を除去してからファイル名を設定
    const sanitizedName = sanitizeFilename(name);
    const filename = `${sanitizedName}.md`;

    // Chrome downloadsAPIを使用してダウンロード
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: saveAs, // trueにすると毎回「名前を付けて保存」ダイアログが表示される
      conflictAction: "overwrite", // 同名ファイルがある場合は上書きする
    });

    // ダウンロードが完了するまで待機
    // 中断された場合も待ち続けないよう、interrupted も終了として扱う
    await new Promise<void>((resolve, reject) => {
      const listener = (delta: chrome.downloads.DownloadDelta) => {
        if (delta.id !== downloadId) return;
        const state = delta.state?.current;
        if (state === "complete") {
          chrome.downloads.onChanged.removeListener(listener);
          resolve();
        } else if (state === "interrupted") {
          chrome.downloads.onChanged.removeListener(listener);
          reject(
            new Error(delta.error?.current ?? "ダウンロードが中断されました")
          );
        }
      };
      chrome.downloads.onChanged.addListener(listener);
    });

    // ダウンロードしたファイルの情報を取得
    const [downloadItem] = await chrome.downloads.search({ id: downloadId });
    const filePath = downloadItem?.filename || "";

    // ダウンロードフォルダのパスを保存（後で表示するため）
    if (filePath) {
      await chrome.storage.local.set({ lastDownloadPath: filePath });
    }

    return { success: true, filePath };
  } catch (error: any) {
    console.error("ダウンロードエラー:", error);
    return { success: false, error: error.message };
  }
};
