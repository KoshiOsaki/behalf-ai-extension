# 実装メモ

Gijiro は Google Meet のローカル議事録拡張機能。Meet ページに字幕履歴のサイドドロワーを表示し、Markdown / Notion へのエクスポートとクリップボードへのコピーを行う。発言候補の生成（Gemini）は使われていなかったため廃止した。

## 全体構成

```
content script (Meet ページに注入)
  └─ CaptionAssistantUI (React root)
       ├─ scraper.ts / caption.ts  … Meet の DOM から字幕をスクレイピング・監視
       ├─ SideDrawer               … 字幕履歴 + エクスポートのUI
       └─ chrome.runtime.sendMessage → background (service worker)

background (service worker) … メッセージのルーター
  ├─ download.ts  … Markdown ダウンロード
  └─ notion.ts    … Notion API エクスポート

options ページ … Notion 設定を chrome.storage.local に保存
```

## エントリポイント

- **`entrypoints/content.ts`**: `*://*.meet.google.com/*` にマッチ。`injectUI()` を呼ぶだけ。
- **`entrypoints/background.ts`**: `chrome.runtime.onMessage` のルーター（下記メッセージ表）。
- **`entrypoints/options/options.ts`**: オプションページ。Notion 設定（secret / databaseId）を `chrome.storage.local` に保存。
- **`entrypoints/popup/`**: ツールバーアイコンのポップアップ（WXT テンプレート由来、本機能では未使用）。

## メッセージ（content → background）

| type | 送信元 | background の処理 |
|------|--------|------------------|
| `download-markdown` | `caption.ts` (`exportCaptionsToMarkdown`) | `download.ts` の `downloadMarkdown` でデータURL化して `chrome.downloads` 保存 |
| `open-options-page` | `SideDrawer.tsx` | `chrome.runtime.openOptionsPage()` |
| `NOTION_EXPORT` | `SideDrawer.tsx` | `notion.ts` の `saveCaptionsToNotion` |

いずれも非同期応答のため、リスナーは `return true` を返す。

## 主要モジュール

### 字幕スクレイピング `src/utils/scraper.ts`
- `findCaptionContainer()`: `role="region"` かつ `aria-label` に字幕系キーワード（字幕/caption/subtitle/sous-titre/untertitel）を含む領域を探す。多言語UI対応。
- `getCaptionDataList()`: 字幕領域直下の `div` を走査し、**class名/idに依存せず構造から**字幕行を判定（`isCaptionEntry`）、`parseCaptionEntry` で speaker / text / timestamp を抽出。
- 行の同一性は DOM 要素ベースの ID（`WeakMap` + カウンタ）で担保。timestamp はアバター img の `data-iml` から取得し、取れなければ 0。
- `isCheckCaptionActive()`: 字幕ボタン（`data-tooltip-id="ucc-8"`）の `aria-pressed` などで字幕ON/OFFを判定。

### 字幕監視・エクスポート `src/utils/caption.ts`
- `observePageForCaptionContainer` / `observeCaptionChanges`: `MutationObserver` で字幕コンテナの出現と変化を監視。前回と差分があるときだけコールバック。
- `exportCaptionsToMarkdown`: 字幕を10分ごとにグループ化して Markdown 生成 → `download-markdown` メッセージ送信。

### UI `src/components/`
- `CaptionAssistantUI.tsx`: React root を `body` に挿入。字幕を監視して state 更新、`SideDrawer` + `CaptionsList` を描画。
- `SideDrawer.tsx`: 字幕履歴ドロワー。Markdownダウンロード（通常/保存先選択）、Notionエクスポート・全文コピーのボタンを持つ。`chrome.storage.local` から Notion 設定の有無を確認し、未設定ならオプションページへ誘導。

### background 側ユーティリティ
- `src/utils/download.ts`: service worker では Blob が使えないため `data:` URL を base64 で生成して `chrome.downloads.download`。`sanitizeFilename` でファイル名の禁止文字を除去、`groupBy10min` で時間グループ化。
- `src/utils/notion.ts`: Notion API（`2022-06-28`）。同名・同日のページを検索し、あれば既存ブロックを全削除して更新、なければ新規作成。ブロックは100個ずつ分割して PATCH。
