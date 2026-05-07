// Prism Live Capture — Phase 5 Stub
// Chrome/Edge extension for tab audio capture during live meetings

console.log('Prism Live Capture background script loaded (Phase 5 stub)');

// Stub: Start capturing tab audio
async function startCapture(tabId) {
  console.log('[Prism] Starting capture for tab:', tabId);
  // Phase 5 implementation:
  // 1. chrome.tabCapture.capture() for tab audio
  // 2. Stream audio chunks to backend /api/live-capture
  // 3. Show consent banner before capture starts
  return { status: 'stub', message: 'Live capture in Phase 5' };
}

// Stub: Stop capturing
async function stopCapture() {
  console.log('[Prism] Stopping capture');
  // Phase 5 implementation:
  // 1. Stop tabCapture stream
  // 2. Notify backend capture ended
  return { status: 'stub' };
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    startCapture(tab.id);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startCapture') {
    startCapture(msg.tabId).then(sendResponse);
    return true; // async
  }
  if (msg.action === 'stopCapture') {
    stopCapture().then(sendResponse);
    return true;
  }
});
