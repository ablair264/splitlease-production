// Background service worker - not subject to page CSP

const API_URL = 'https://splitlease.netlify.app';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureSession') {
    handleCapture(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }
});

async function handleCapture({ csrfToken, cookies, profile }) {
  const response = await fetch(`${API_URL}/api/lex-autolease/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csrfToken, cookies, profile })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}
