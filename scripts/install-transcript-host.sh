#!/bin/bash
# Gijiro の「字幕をこの PC に保存」用 Native Messaging ホストを登録する。
#
#   ./scripts/install-transcript-host.sh <拡張機能ID> [<拡張機能ID> ...]
#   ./scripts/install-transcript-host.sh --uninstall
#
# 拡張機能ID は Gijiro の設定画面、または chrome://extensions で確認できる。
# ストア版と開発版（パッケージ化されていない拡張機能）で ID が違うので、両方使うなら並べて渡す。
# 保存先を変えたいときは GIJIRO_TRANSCRIPT_DIR=/path/to/dir を付けて実行する（既定は ~/.gijiro/meetings）。
set -euo pipefail

HOST_NAME="com.gijiro.transcript"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Chromium 系ブラウザはそれぞれ自分のユーザーデータ配下の NativeMessagingHosts を読む。
# インストール済みのブラウザ（ユーザーデータのディレクトリがあるもの）すべてに manifest を置く
case "$(uname -s)" in
  Darwin)
    INSTALL_DIR="$HOME/Library/Application Support/Gijiro/transcript-host"
    SUPPORT="$HOME/Library/Application Support"
    BROWSER_DIRS=(
      "$SUPPORT/Google/Chrome"
      "$SUPPORT/Arc/User Data"
      "$SUPPORT/BraveSoftware/Brave-Browser"
      "$SUPPORT/Microsoft Edge"
      "$SUPPORT/Chromium"
    )
    ;;
  Linux)
    INSTALL_DIR="$HOME/.local/share/gijiro/transcript-host"
    BROWSER_DIRS=(
      "$HOME/.config/google-chrome"
      "$HOME/.config/BraveSoftware/Brave-Browser"
      "$HOME/.config/microsoft-edge"
      "$HOME/.config/chromium"
    )
    ;;
  *)
    echo "未対応の OS です: $(uname -s)" >&2
    exit 1
    ;;
esac

MANIFEST_PATHS=()
for dir in "${BROWSER_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    MANIFEST_PATHS+=("$dir/NativeMessagingHosts/$HOST_NAME.json")
  fi
done

if [ "${1:-}" = "--uninstall" ]; then
  for path in "${MANIFEST_PATHS[@]}"; do
    rm -f "$path"
    echo "削除しました: $path"
  done
  rm -rf "$INSTALL_DIR"
  echo "アンインストールしました"
  echo "保存済みの字幕（${GIJIRO_TRANSCRIPT_DIR:-$HOME/.gijiro/meetings}）は残しています。"
  exit 0
fi

if [ $# -eq 0 ]; then
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

for id in "$@"; do
  if ! [[ "$id" =~ ^[a-p]{32}$ ]]; then
    echo "拡張機能ID の形式が不正です（a〜p の32文字）: $id" >&2
    exit 1
  fi
done

# Chrome はホストを最小限の PATH で起動するので、node は実体の絶対パスで固定する。
# nodenv / asdf の shim は PATH 前提で動くため、shim のままだと起動できない
NODE_BIN="${NODE_BIN:-}"
if [ -z "$NODE_BIN" ] && command -v nodenv >/dev/null 2>&1; then
  NODE_BIN="$(nodenv which node 2>/dev/null || true)"
fi
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node || true)"
fi
if [ -z "$NODE_BIN" ]; then
  echo "node が見つかりません。NODE_BIN=/path/to/node で指定してください" >&2
  exit 1
fi

if [ ${#MANIFEST_PATHS[@]} -eq 0 ]; then
  echo "Chromium 系ブラウザ（Chrome / Arc / Brave / Edge / Chromium）が見つかりません" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
cp "$REPO_ROOT/native-host/gijiro-transcript-host.mjs" "$INSTALL_DIR/host.mjs"

DIR_EXPORT=""
if [ -n "${GIJIRO_TRANSCRIPT_DIR:-}" ]; then
  DIR_EXPORT="export GIJIRO_TRANSCRIPT_DIR=\"$GIJIRO_TRANSCRIPT_DIR\""
fi

cat > "$INSTALL_DIR/run.sh" <<EOF
#!/bin/bash
$DIR_EXPORT
exec "$NODE_BIN" "$INSTALL_DIR/host.mjs"
EOF
chmod +x "$INSTALL_DIR/run.sh"

ORIGINS=""
for id in "$@"; do
  ORIGINS="$ORIGINS${ORIGINS:+, }\"chrome-extension://$id/\""
done

for path in "${MANIFEST_PATHS[@]}"; do
  mkdir -p "$(dirname "$path")"
  cat > "$path" <<EOF
{
  "name": "$HOST_NAME",
  "description": "Gijiro local transcript writer",
  "path": "$INSTALL_DIR/run.sh",
  "type": "stdio",
  "allowed_origins": [$ORIGINS]
}
EOF
done

echo "インストールしました"
for path in "${MANIFEST_PATHS[@]}"; do
  echo "  manifest: $path"
done
echo "  host:     $INSTALL_DIR/run.sh"
echo "  node:     $NODE_BIN"
echo "  保存先:   ${GIJIRO_TRANSCRIPT_DIR:-$HOME/.gijiro/meetings}"
echo "Gijiro の設定画面で「接続テスト」を押して確認してください。"
