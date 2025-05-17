// オプションページの初期化
document.addEventListener('DOMContentLoaded', async () => {
  const geminiKeyInput = document.getElementById('geminiKey') as HTMLInputElement;
  const notionSecretInput = document.getElementById('notionSecret') as HTMLInputElement;
  const notionDatabaseIdInput = document.getElementById('notionDatabaseId') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusElement = document.getElementById('status') as HTMLSpanElement;

  // 保存されている設定を読み込む
  const result = await chrome.storage.local.get(['geminiApiKey', 'notion']);
  if (result.geminiApiKey) {
    geminiKeyInput.value = result.geminiApiKey;
  }
  
  // Notion設定を読み込む
  if (result.notion) {
    notionSecretInput.value = result.notion.secret || '';
    notionDatabaseIdInput.value = result.notion.databaseId || '';
  }

  // 保存ボタンのクリックイベント
  saveButton.addEventListener('click', async () => {
    const geminiApiKey = geminiKeyInput.value.trim();
    const notionSecret = notionSecretInput.value.trim();
    const notionDatabaseId = notionDatabaseIdInput.value.trim();
    
    // Gemini API Keyを保存
    await chrome.storage.local.set({
      geminiApiKey
    });
    
    // Notion設定を保存
    await chrome.storage.local.set({
      notion: {
        secret: notionSecret,
        databaseId: notionDatabaseId
      }
    });
    
    statusElement.textContent = "保存しました ✅";
    setTimeout(() => {
      statusElement.textContent = "";
    }, 2000);
  });
});
