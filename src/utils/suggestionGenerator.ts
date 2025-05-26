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
会話全体を考慮しつつ、特に直近7ラリーの会話に注目して発言候補を生成してください。
会議の文脈を理解し、話者の役割や立場を考慮した上で、自然で建設的な発言を提案してください。
各候補は簡潔で、会議の進行に貢献するものにしてください。

重要：直近7ラリーの会話で議論されているトピックや質問に対して、具体的に応答する内容を提案してください。
会話の最新の流れを特に重視し、適切なフォローアップや新しい視点を提供してください。

## 出力フォーマット

以下の形式で2つの発言候補を出力してください：

\`\`\`json
[
  "最初の発言候補をここに記入してください。簡潔で具体的な内容にしてください。直近の会話に直接関連する内容にしてください。",
  "2つ目の発言候補をここに記入してください。1つ目とは異なる視点や内容にしてください。こちらも直近の会話に直接関連する内容にしてください。"
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
    // 会話履歴の構築（トークン節約のために最大ラリー数を制限）
    // 約10分の会話量として最大ラリー数を設定（30ラリー程度）
    const MAX_CONVERSATION_ENTRIES = 30;

    // 最新のMAX_CONVERSATION_ENTRIES件の字幕データを取得
    const limitedCaptions =
      captions.length > MAX_CONVERSATION_ENTRIES
        ? captions.slice(-MAX_CONVERSATION_ENTRIES)
        : captions;

    const conversationHistory = limitedCaptions
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
        count,
      },
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
