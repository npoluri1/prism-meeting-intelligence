// Prism Live Capture — Popup script (Phase 5 stub)

let isCapturing = false;

document.getElementById('startBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.runtime.sendMessage(
        { action: 'startCapture', tabId: tabs[0].id },
        (resp) => {
          document.getElementById('status').textContent = 'Capture started (stub)...';
          document.getElementById('startBtn').disabled = true;
          document.getElementById('stopBtn').disabled = false;
          isCapturing = true;
        }
      );
    }
  });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stopCapture' }, (resp) => {
    document.getElementById('status').textContent = 'Capture stopped.';
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    isCapturing = false;
  });
});
