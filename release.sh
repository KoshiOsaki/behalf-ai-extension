#!/bin/bash

# バージョン情報をwxt.config.tsから取得
VERSION=$(grep -o 'version: "[^"]*"' wxt.config.ts | cut -d'"' -f2)
VERSION_TAG="v$VERSION"
PACKAGE_NAME=$(grep -o '"name": "[^"]*"' package.json | head -1 | cut -d'"' -f4)
ZIPFILE=".output/behalf-ai-extension-$VERSION.zip"
WXT_ZIPFILE=".output/$PACKAGE_NAME-$VERSION-chrome.zip"

echo "ビルドとリリースを開始します: バージョン $VERSION_TAG"

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

# GitHubリリース作成
echo "GitHubリリースを作成しています..."
gh release create $VERSION_TAG $ZIPFILE \
  --title "Behalf AI Extension $VERSION_TAG" \
  --notes "
プロジェクトの詳細については[プロジェクト概要](docs/project.md)を参照してください。
使い方は[使い方](docs/manual.md)を参照してください。
  "

echo "リリース完了: $VERSION_TAG"