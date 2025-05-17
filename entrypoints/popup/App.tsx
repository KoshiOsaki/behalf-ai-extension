import { useState } from "react";

function App() {
  return (
    <div className="w-80 h-96 p-4 bg-gray-50">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">
          Meet Caption Assistant
        </h1>
        <p className="text-sm text-gray-600">Google Meetのキャプションを強化</p>
      </header>

      <div className="space-y-4">
        <section className="bg-white p-3 rounded-lg shadow-sm">
          <h2 className="text-md font-semibold text-gray-700 mb-2">
            ステータス
          </h2>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm">アクティブ</span>
          </div>
        </section>

        <section className="bg-white p-3 rounded-lg shadow-sm">
          <h2 className="text-md font-semibold text-gray-700 mb-2">機能</h2>
          <ul className="text-sm space-y-2">
            <li className="flex items-center">
              <svg
                className="w-4 h-4 text-blue-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <span>字幕非表示時アラート</span>
            </li>
            <li className="flex items-center">
              <svg
                className="w-4 h-4 text-blue-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <span>サイドパネル表示</span>
            </li>
            <li className="flex items-center">
              <svg
                className="w-4 h-4 text-blue-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <span>キャプション履歴</span>
            </li>
            <li className="flex items-center">
              <svg
                className="w-4 h-4 text-blue-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <span>キャプションエクスポート</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default App;
