import { CaptionData } from "../types";

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
    const data = encoder.encode(content);
    const base64Data = btoa(
      String.fromCharCode.apply(null, [...new Uint8Array(data)])
    );
    const dataUrl = `data:text/markdown;base64,${base64Data}`;

    // ファイル名を設定（デフォルトはDownloadsフォルダに保存）
    const filename = `${name}.md`;

    // Chrome downloadsAPIを使用してダウンロード
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: saveAs, // trueにすると毎回「名前を付けて保存」ダイアログが表示される
      conflictAction: "overwrite", // 同名ファイルがある場合は上書きする
    });

    // ダウンロードが完了するまで待機
    await new Promise<void>((resolve) => {
      const listener = (delta: chrome.downloads.DownloadDelta) => {
        if (delta.id === downloadId && delta.state?.current === "complete") {
          chrome.downloads.onChanged.removeListener(listener);
          resolve();
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
