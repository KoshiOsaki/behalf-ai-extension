#!/bin/bash

# バージョン情報をwxt.config.tsから取得
VERSION=$(grep -o 'version: "[^"]*"' wxt.config.ts | cut -d'"' -f2)
VERSION_TAG="v$VERSION"
PACKAGE_NAME=$(grep -o '"name": "[^"]*"' package.json | head -1 | cut -d'"' -f4)
ZIPFILE=".output/gijiro-$VERSION.zip"
WXT_ZIPFILE=".output/$PACKAGE_NAME-$VERSION-chrome.zip"

echo "ビルドとリリースを開始します: バージョン $VERSION_TAG"

# Node 20 を使う（Homebrew の Node 25 では wxt submit が起動しない）
export PATH="$HOME/.nodenv/shims:$PATH"

# ビルド実行
echo "拡張機能をビルドしています..."
npm run build

# WXTのzip機能を使用
echo "ZIPファイルを作成しています..."
npm run zip
# 注: このコマンドは.output/[package-name]-[version]-chrome.zipを生成します

# ZIPファイルの移動とリネーム
cp "$WXT_ZIPFILE" "$ZIPFILE"
echo "ZIPファイルを $ZIPFILE にコピーしました"

# Chrome ウェブストアへアップロード（.env.submit の認証情報を使用）
# デフォルトは下書きへのアップロードのみ。審査提出はダッシュボードから手動で行う。
# 審査提出まで一気にやりたい場合は SUBMIT_REVIEW=1 ./release.sh
if [ -f .env.submit ]; then
  if [ "$SUBMIT_REVIEW" = "1" ]; then
    echo "Chrome ウェブストアにアップロードして審査に提出しています..."
    npx wxt submit --chrome-zip "$WXT_ZIPFILE"
  else
    echo "Chrome ウェブストアの下書きにアップロードしています（審査提出はしません）..."
    npx wxt submit --chrome-zip "$WXT_ZIPFILE" --chrome-skip-submit-review
  fi
else
  echo "警告: .env.submit が無いため Chrome ウェブストアへの提出をスキップしました"
  echo "      認証情報を作るには: npx wxt submit init"
fi

# GitHubリリース作成
echo "GitHubリリースを作成しています..."
gh release create $VERSION_TAG $ZIPFILE \
  --title "Gijiro $VERSION_TAG" \
  --notes "
プロジェクトの詳細については[プロジェクト概要](docs/project.md)を参照してください。
使い方は[使い方](docs/manual.md)を参照してください。
  "

echo "リリース完了: $VERSION_TAG"
