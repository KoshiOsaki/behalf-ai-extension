import { CaptionData } from "../types";

/** scripts/install-transcript-host.sh が登録する Native Messaging ホスト名 */
export const TRANSCRIPT_HOST_NAME = "com.gijiro.transcript";

/** chrome.storage.local のキー。ON のときだけ字幕をこの PC に書き出す */
export const LOCAL_TRANSCRIPT_STORAGE_KEY = "localTranscript";

export interface LocalTranscriptSettings {
  enabled: boolean;
}

/** content script → background */
export interface LocalTranscriptWriteRequest {
  type: "local-transcript-write";
  fileName: string;
  content: string;
}

export type HostResponse =
  | { ok: true; path?: string; dir?: string; version?: string }
  | { ok: false; error: string; needsReload?: boolean };

// 権限を反映するために拡張機能を再起動したあと、設定画面を開き直すための目印
export const REOPEN_OPTIONS_STORAGE_KEY = "reopenOptionsAfterReload";

const pad = (value: number) => value.toString().padStart(2, "0");

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTime = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

// ファイル名に使えない文字と、パス区切りになりうる文字を落とす
const sanitizeForFileName = (value: string) =>
  value
    .replace(/[\/\\:*?"<>|\0]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 60);

export const getMeetingCode = (): string | null => {
  const match = location.pathname.match(/([a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4})/i);
  return match ? match[1] : null;
};

/**
 * 会議 1 回分のファイル名。参加し直すと字幕は空から取り直しになるので、
 * 最初の字幕の時刻を入れて別ファイルにする
 */
export const buildTranscriptFileName = (
  sessionStartedAt: number,
  meetingTitle: string | null,
  meetingCode: string | null
): string => {
  const started = new Date(sessionStartedAt);
  const parts = [
    formatDate(started),
    `${pad(started.getHours())}${pad(started.getMinutes())}`,
    meetingCode,
    meetingTitle && meetingTitle !== meetingCode ? sanitizeForFileName(meetingTitle) : null,
  ].filter((part): part is string => Boolean(part));
  return `${parts.join("_")}.md`;
};

/**
 * Claude Code などが読む前提の字幕ファイル本文。
 * 1 行 1 発言・時刻付きにして、末尾だけ読む / grep するときに扱いやすくする
 */
export const buildTranscriptContent = (
  captions: CaptionData[],
  meetingTitle: string | null,
  meetingCode: string | null
): string => {
  const sorted = [...captions].sort((a, b) => a.timestamp - b.timestamp);
  const started = sorted[0] ? new Date(sorted[0].timestamp) : new Date();

  const header = [
    "---",
    `title: ${JSON.stringify(meetingTitle ?? meetingCode ?? "meeting")}`,
    meetingCode ? `meet_url: https://meet.google.com/${meetingCode}` : null,
    `started_at: ${started.toISOString()}`,
    `updated_at: ${new Date().toISOString()}`,
    `lines: ${sorted.length}`,
    "---",
    "",
  ].filter((line): line is string => line !== null);

  const body = sorted.map(
    (caption) =>
      `[${formatTime(new Date(caption.timestamp))}] ${caption.speaker}: ${caption.text.replace(/\s*\n\s*/g, " ")}`
  );

  return `${[...header, ...body].join("\n")}\n`;
};
