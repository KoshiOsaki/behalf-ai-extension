import { LOCAL_TRANSCRIPT_STORAGE_KEY } from '@/src/utils/localTranscript';

const requestNativeMessaging = () =>
  chrome.permissions.request({ permissions: ['nativeMessaging'] });

// オプションページの初期化
document.addEventListener('DOMContentLoaded', async () => {
  const notionSecretInput = document.getElementById('notionSecret') as HTMLInputElement;
  const notionDatabaseIdInput = document.getElementById('notionDatabaseId') as HTMLInputElement;
  const localTranscriptInput = document.getElementById('localTranscriptEnabled') as HTMLInputElement;
  const installCommandElement = document.getElementById('installCommand') as HTMLPreElement;
  const pingButton = document.getElementById('pingHost') as HTMLButtonElement;
  const pingStatusElement = document.getElementById('pingStatus') as HTMLSpanElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusElement = document.getElementById('status') as HTMLSpanElement;

  installCommandElement.textContent = `./scripts/install-transcript-host.sh ${chrome.runtime.id}`;

  // 保存されている設定を読み込む
  const result = await chrome.storage.local.get(['notion', LOCAL_TRANSCRIPT_STORAGE_KEY]);

  // Notion設定を読み込む
  if (result.notion) {
    notionSecretInput.value = result.notion.secret || '';
    notionDatabaseIdInput.value = result.notion.databaseId || '';
  }
  localTranscriptInput.checked = Boolean(result[LOCAL_TRANSCRIPT_STORAGE_KEY]?.enabled);

  const showPingResult = (ok: boolean, text: string) => {
    pingStatusElement.style.color = ok ? '#10b981' : '#dc2626';
    pingStatusElement.textContent = text;
  };

  pingButton.addEventListener('click', async () => {
    // permissions.request はユーザー操作の直後でないと失敗するので、他の await より先に呼ぶ
    if (!(await requestNativeMessaging())) {
      showPingResult(false, 'nativeMessaging の権限が許可されませんでした');
      return;
    }
    showPingResult(true, '確認中…');
    const response = await chrome.runtime.sendMessage({ type: 'local-transcript-ping' });
    if (response?.ok) {
      showPingResult(true, `接続できました ✅ 保存先: ${response.dir}`);
    } else {
      showPingResult(false, response?.error ?? '接続できませんでした');
    }
  });

  // 保存ボタンのクリックイベント
  saveButton.addEventListener('click', async () => {
    const localTranscriptEnabled = localTranscriptInput.checked;
    // permissions.request はユーザー操作の直後でないと失敗するので、他の await より先に呼ぶ
    if (localTranscriptEnabled && !(await requestNativeMessaging())) {
      statusElement.style.color = '#dc2626';
      statusElement.textContent = '字幕保存に必要な権限が許可されませんでした';
      return;
    }

    const notionSecret = notionSecretInput.value.trim();
    const notionDatabaseId = notionDatabaseIdInput.value.trim();

    // Notion設定を保存（両方揃っていない場合は未設定として削除する）
    if (notionSecret && notionDatabaseId) {
      await chrome.storage.local.set({
        notion: {
          secret: notionSecret,
          databaseId: notionDatabaseId
        }
      });
    } else {
      await chrome.storage.local.remove('notion');
    }

    await chrome.storage.local.set({
      [LOCAL_TRANSCRIPT_STORAGE_KEY]: { enabled: localTranscriptEnabled },
    });

    statusElement.style.color = '';
    statusElement.textContent = "保存しました ✅";
    setTimeout(() => {
      statusElement.textContent = "";
    }, 2000);
  });
});
