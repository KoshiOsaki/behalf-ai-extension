import { GoogleGenAI } from "@google/genai";

export const handleGeminiCall = async (data: {
  prompt: string;
  count?: number; // 生成する発言候補の数
}): Promise<string[]> => {
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
};
