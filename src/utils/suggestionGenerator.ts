import { GoogleGenAI } from "@google/genai";
import { CaptionData } from "../types";

// Gemini APIのキー（Chrome拡張機能の設定から取得）
// 実装上はハードコードしていますが、実際の実装ではChromeのストレージAPIなどを使用して取得するようにします
// 例: chrome.storage.local.get(['geminiApiKey'], (result) => { ... })
const API_KEY = "AIzaSyBbFqQdrr8uGw88cVIxUY7XAJEpV9DNcpQ";

/**
 * プロンプトテンプレートを取得する
 * @returns プロンプトテンプレート
 */
function loadPromptTemplate(): string {
  // プロンプトを直接文字列として定義
  return `
# 発言候補生成プロンプト

以下は会議の会話履歴です：

{conversationHistory}

## 指示

あなたは会議の参加者として、次の発言として適切な候補を考えてください。
会議の文脈を理解し、話者の役割や立場を考慮した上で、自然で建設的な発言を提案してください。
各候補は簡潔で、会議の進行に貢献するものにしてください。

## 出力フォーマット

以下の形式で2つの発言候補を出力してください：

\`\`\`json
[
  "最初の発言候補をここに記入してください。簡潔で具体的な内容にしてください。",
  "2つ目の発言候補をここに記入してください。1つ目とは異なる視点や内容にしてください。"
]
\`\`\`

注意：JSON形式で出力し、余分なテキストは含めないでください。
  `;
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
