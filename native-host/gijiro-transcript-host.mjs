#!/usr/bin/env node
// Gijiro の字幕をこの PC のファイルに書き出す Native Messaging ホスト。
// Chrome から 1 メッセージ受け取り、1 応答を返して終了する（sendNativeMessage 用）。
//   ping:  { type: "ping" }                         → { ok, version, dir }
//   write: { type: "write", fileName, content }     → { ok, path }
// 保存先は GIJIRO_TRANSCRIPT_DIR（既定は ~/.gijiro/meetings）。
// 実体は scripts/install-transcript-host.sh がインストール先にコピーして使う。
import { mkdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const HOST_VERSION = "1";
const TRANSCRIPT_DIR =
  process.env.GIJIRO_TRANSCRIPT_DIR || join(homedir(), ".gijiro", "meetings");
// 1 会議の字幕としては十分大きい上限。想定外の巨大メッセージでディスクを埋めない
const MAX_CONTENT_BYTES = 20 * 1024 * 1024;

function readMessage() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      if (buffer.length < 4) return;
      const length = buffer.readUInt32LE(0);
      if (buffer.length < 4 + length) return;
      try {
        resolve(JSON.parse(buffer.subarray(4, 4 + length).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    process.stdin.on("end", () => reject(new Error("メッセージを受信できませんでした")));
  });
}

function writeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

// 拡張から来たファイル名で保存先の外に書かせない
function isSafeFileName(fileName) {
  return (
    typeof fileName === "string" &&
    fileName.length > 0 &&
    fileName.length <= 200 &&
    fileName.endsWith(".md") &&
    !fileName.startsWith(".") &&
    !/[\/\\\0]/.test(fileName)
  );
}

async function handle(message) {
  if (message?.type === "ping") {
    return { ok: true, version: HOST_VERSION, dir: TRANSCRIPT_DIR };
  }

  if (message?.type === "write") {
    const { fileName, content } = message;
    if (!isSafeFileName(fileName)) {
      return { ok: false, error: `ファイル名が不正です: ${fileName}` };
    }
    if (typeof content !== "string") {
      return { ok: false, error: "content が文字列ではありません" };
    }
    if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
      return { ok: false, error: "字幕が大きすぎるため保存しませんでした" };
    }

    await mkdir(TRANSCRIPT_DIR, { recursive: true });
    const path = join(TRANSCRIPT_DIR, fileName);
    // 読み手（Claude Code など）が書きかけを読まないよう、一時ファイルに書いてから差し替える
    const tmpPath = join(TRANSCRIPT_DIR, `.${fileName}.${process.pid}.tmp`);
    await writeFile(tmpPath, content, "utf8");
    await rename(tmpPath, path);
    return { ok: true, path };
  }

  return { ok: false, error: `未対応のメッセージです: ${message?.type}` };
}

try {
  const message = await readMessage();
  writeMessage(await handle(message));
} catch (error) {
  writeMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
}
