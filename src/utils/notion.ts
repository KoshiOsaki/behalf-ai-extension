import { CaptionData } from "../types";
import { groupBy10min } from "./download";

const buildBlocks = (groupedCaptions: Record<string, CaptionData[]>): any[] => {
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
};

export const saveCaptionsToNotion = async (
  captions: CaptionData[],
  meetingTitle: string
): Promise<void> => {
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
  const allChildren = buildBlocks(grouped);

  // 同じタイトルのページを検索
  const searchResponse = await fetch(
    `https://api.notion.com/v1/databases/${notion.databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notion.secret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              property: "名前",
              title: {
                equals: meetingTitle,
              },
            },
            {
              property: "Date",
              date: {
                equals: new Date().toISOString().split("T")[0],
              },
            },
          ],
        },
        sorts: [
          {
            property: "Date",
            direction: "descending",
          },
        ],
      }),
    }
  );

  if (!searchResponse.ok) {
    const errorData = await searchResponse.json();
    throw new Error(
      `Notion API 検索エラー: ${errorData.message || searchResponse.statusText}`
    );
  }

  const searchResults = await searchResponse.json();
  let pageId: string;

  // 同じタイトルのページが存在する場合は更新、存在しない場合は新規作成
  if (searchResults.results && searchResults.results.length > 0) {
    // 既存のページを更新
    pageId = searchResults.results[0].id;

    // まず既存のページの子ブロックを取得
    const blocksResponse = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${notion.secret}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );

    if (!blocksResponse.ok) {
      const errorData = await blocksResponse.json();
      throw new Error(
        `ブロック取得エラー: ${errorData.message || blocksResponse.statusText}`
      );
    }

    const blocksData = await blocksResponse.json();

    // 全ての子ブロックを削除
    for (const block of blocksData.results) {
      await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${notion.secret}`,
          "Notion-Version": "2022-06-28",
        },
      });
    }
  } else {
    // 新しいページを作成（最初は空のページを作成し、後でコンテンツを追加）
    const createResponse = await fetch("https://api.notion.com/v1/pages", {
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
        // 空のchildrenで作成
        children: [],
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(
        `Notion ページ作成エラー: ${
          errorData.message || createResponse.statusText
        }`
      );
    }

    const createResult = await createResponse.json();
    pageId = createResult.id;
  }

  // childrenを100個ずつに分割して追加
  const MAX_CHILDREN_PER_REQUEST = 100;
  const childrenChunks: any[][] = [];

  for (let i = 0; i < allChildren.length; i += MAX_CHILDREN_PER_REQUEST) {
    childrenChunks.push(allChildren.slice(i, i + MAX_CHILDREN_PER_REQUEST));
  }

  // 各チャンクを順番に追加
  for (const children of childrenChunks) {
    const response = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${notion.secret}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          children,
        }),
      }
    );

    // レスポンスが正常でない場合はエラー
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Notion API エラー: ${errorData.message || response.statusText}`
      );
    }
  }
};
