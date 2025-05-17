import { CaptionData } from "../types";

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

    // バックグラウンドスクリプトにメッセージを送信してGemini APIを呼び出す
    const response = await chrome.runtime.sendMessage({
      type: "call-gemini",
      data: {
        prompt,
        count
      }
    });

    // エラーチェック
    if (response.error) {
      console.error("Gemini API エラー:", response.error);
      return [];
    }

    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error("発言候補の生成中にエラーが発生しました:", error);
    return [];
  }
}
