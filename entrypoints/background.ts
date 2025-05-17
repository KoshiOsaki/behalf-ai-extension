import { GoogleGenAI } from "@google/genai";
import { defineBackground } from "wxt/sandbox";
import { CaptionData } from "../src/types";

export default defineBackground(() => {
  console.log("Background service worker started", { id: browser.runtime.id });

  // メッセージリスナーを設定
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "call-gemini") {
      handleGeminiCall(message.data)
        .then(sendResponse)
        .catch((error) => {
          console.error("Gemini API呼び出しエラー:", error);
          sendResponse({ error: error.message });
        });
      return true; // 非同期応答のために必要
    }

    // オプションページを開くメッセージを処理
    if (message.type === "open-options-page") {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      return true;
    }

    // Notionエクスポートのメッセージを処理
    if (message.type === "NOTION_EXPORT") {
      saveCaptionsToNotion(
        message.payload.captions,
        message.payload.meetingTitle
      )
        .then(() => sendResponse({ ok: true }))
        .catch((error) => {
          console.error("Notionエクスポートエラー:", error);
          sendResponse({ ok: false, error: error.message });
        });
      return true; // 非同期応答のために必要
    }
  });

  /**
   * Gemini APIを呼び出す処理
   * @param data - APIに送信するデータ
   * @returns 生成された発言候補の配列
   */
  async function handleGeminiCall(data: {
    prompt: string;
    count?: number;
  }): Promise<string[]> {
    try {
      // ストレージからAPIキーを取得
      const storage = await chrome.storage.local.get(["geminiApiKey"]);
      const apiKey = storage.geminiApiKey;

      if (!apiKey) {
        throw new Error(
          "Gemini API キーが設定されていません。オプションページで設定してください。"
        );
      }

      // APIクライアントの初期化
      const ai = new GoogleGenAI({ apiKey });

      // Gemini APIを呼び出し
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: data.prompt }] }],
      });

      // レスポンスからテキストを取得
      const responseText =
        response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // JSON形式の文字列を抽出
      const jsonMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseText.match(/\[\s*".*"\s*,\s*".*"\s*\]/);

      if (jsonMatch) {
        try {
          // JSONをパース
          const suggestions = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          return Array.isArray(suggestions)
            ? suggestions.slice(0, data.count || 2)
            : [];
        } catch (e) {
          console.error("JSONのパースに失敗しました:", e);
          return [];
        }
      }

      // JSON形式でない場合は行ごとに分割して返す
      return responseText
        .split(/\n+/)
        .filter(
          (line) =>
            line.trim().length > 0 &&
            !line.startsWith("#") &&
            !line.startsWith("```")
        )
        .slice(0, data.count || 2);
    } catch (error) {
      console.error("発言候補の生成中にエラーが発生しました:", error);
      throw error;
    }
  }

  /**
   * 字幕データをNotionデータベースに保存する
   * @param captions - 字幕データの配列
   * @param meetingTitle - 会議のタイトル
   */
  async function saveCaptionsToNotion(
    captions: CaptionData[],
    meetingTitle: string
  ): Promise<void> {
    // Notionの設定を取得
    const { notion } = (await chrome.storage.local.get("notion")) as {
      notion?: { secret: string; databaseId: string };
    };

    // 設定が存在しない場合はエラー
    if (!notion?.secret || !notion?.databaseId) {
      throw new Error("Notion未連携。オプションページで設定してください。");
    }

    // 字幕データを10分ごとにグループ化
    const grouped = groupBy10min(captions);

    // Notionのブロックを構築
    const children = buildBlocks(grouped);

    // Notion APIを呼び出してページを作成
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notion.secret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: notion.databaseId },
        properties: {
          名前: { title: [{ text: { content: meetingTitle } }] },
          Date: { date: { start: new Date().toISOString().split("T")[0] } },
        },
        children,
      }),
    });

    // レスポンスが正常でない場合はエラー
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Notion API エラー: ${errorData.message || response.statusText}`
      );
    }
  }

  /**
   * 字幕データを10分ごとにグループ化する
   * @param captions - 字幕データの配列
   * @returns グループ化された字幕データ
   */
  function groupBy10min(
    captions: CaptionData[]
  ): Record<string, CaptionData[]> {
    const grouped: Record<string, CaptionData[]> = {};

    for (const caption of captions) {
      // タイムスタンプから時間を抽出（例: '09:30'）
      const date = new Date(caption.timestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      // 10分単位に丸める
      const roundedMinutes = Math.floor(minutes / 10) * 10;
      // フォーマットされた時間（例: '09:30'）
      const formattedTime = `${hours
        .toString()
        .padStart(2, "0")}:${roundedMinutes.toString().padStart(2, "0")}`;

      if (!grouped[formattedTime]) {
        grouped[formattedTime] = [];
      }

      grouped[formattedTime].push(caption);
    }

    return grouped;
  }

  /**
   * Notionのブロックを構築する
   * @param groupedCaptions - グループ化された字幕データ
   * @returns Notionのブロック配列
   */
  function buildBlocks(groupedCaptions: Record<string, CaptionData[]>): any[] {
    const blocks: any[] = [];

    // 時間順にソート
    const times = Object.keys(groupedCaptions).sort();

    for (const time of times) {
      // 時間の見出しを追加
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: time } }],
        },
      });

      // その時間帯の字幕を追加
      for (const caption of groupedCaptions[time]) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { text: { content: `${caption.speaker}: ${caption.text}` } },
            ],
          },
        });
      }
    }

    return blocks;
  }
});
