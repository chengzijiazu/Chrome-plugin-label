// popup.js

document.getElementById("openOptionsBtn").addEventListener("click", () => {
  // 打开 options 页面
  chrome.runtime.openOptionsPage();
});
