// オプションページの初期化
document.addEventListener('DOMContentLoaded', async () => {
  const geminiKeyInput = document.getElementById('geminiKey') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusElement = document.getElementById('status') as HTMLSpanElement;

  // 保存されている設定を読み込む
  const result = await chrome.storage.local.get(['geminiApiKey']);
  if (result.geminiApiKey) {
    geminiKeyInput.value = result.geminiApiKey;
  }

  // 保存ボタンのクリックイベント
  saveButton.addEventListener('click', async () => {
    const geminiApiKey = geminiKeyInput.value.trim();
    
    await chrome.storage.local.set({
      geminiApiKey
    });
    
    statusElement.textContent = "保存しました ✅";
    setTimeout(() => {
      statusElement.textContent = "";
    }, 2000);
  });
});
