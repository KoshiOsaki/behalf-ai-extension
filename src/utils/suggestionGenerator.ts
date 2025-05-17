import { GoogleGenAI } from "@google/genai";
import { CaptionData } from "../types";
import * as fs from "fs";
import * as path from "path";

// Gemini APIのキー（環境変数から取得）
const API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * プロンプトテンプレートを読み込む
 * @returns プロンプトテンプレート
 */
function loadPromptTemplate(): string {
  try {
    // 拡張機能のコンテキストでファイルを読み込むための処理
    // ブラウザ環境では直接ファイルを読み込めないため、ビルド時に埋め込む必要がある
    // webpack等のバンドラーでこのファイルを文字列として埋め込む設定が必要
    return require("../prompts/suggestionPrompt.md");
  } catch (error) {
    throw error;
  }
}

/**
 * 会話履歴から発言候補を生成する
 * @param captions 字幕データの配列
 * @param count 生成する候補の数（デフォルト: 2）
 * @returns 生成された発言候補の配列
 */
export async function generateSuggestions(
  captions: CaptionData[],
  count: number = 2
): Promise<string[]> {
  try {
    if (!API_KEY) {
      console.error("Gemini API キーが設定されていません");
      return [];
    }

    // APIクライアントの初期化
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // 会話履歴の構築
    const conversationHistory = captions
      .map((caption) => `${caption.speaker}: ${caption.text}`)
      .join("\n");

    // プロンプトテンプレートを読み込み、会話履歴を挿入
    const promptTemplate = loadPromptTemplate();
    const prompt = promptTemplate.replace(
      "{conversationHistory}",
      conversationHistory
    );

    // Gemini APIを呼び出し
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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
        return Array.isArray(suggestions) ? suggestions.slice(0, count) : [];
      } catch (e) {
        console.error("JSONのパースに失敗しました:", e);
        return [];
      }
    }

    // JSON形式でない場合は行ごとに分割して返す
    return responseText
      .split(/\n+/)
      .filter(
        (line: string) =>
          line.trim().length > 0 &&
          !line.startsWith("#") &&
          !line.startsWith("```")
      )
      .slice(0, count);
  } catch (error) {
    console.error("発言候補の生成中にエラーが発生しました:", error);
    return [];
  }
}
