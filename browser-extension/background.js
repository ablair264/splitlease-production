// Background service worker for Lex Session Capture

const LEX_DOMAIN = "associate.lexautolease.co.uk";

// Get all cookies for Lex domain
async function getLexCookies() {
  const cookies = await chrome.cookies.getAll({ domain: LEX_DOMAIN });

  // Format cookies as a cookie header string
  const cookieString = cookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return {
    cookies: cookieString,
    cookieList: cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      expirationDate: c.expirationDate
    }))
  };
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCookies") {
    getLexCookies().then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === "captureSession") {
    captureAndSendSession(request.csrfToken, request.apiUrl)
      .then(sendResponse)
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Capture session and send to broker platform
async function captureAndSendSession(csrfToken, apiUrl) {
  const { cookies } = await getLexCookies();

  if (!cookies) {
    throw new Error("No Lex cookies found. Please log in to Lex Autolease first.");
  }

  if (!csrfToken) {
    throw new Error("No CSRF token found. Please make sure you're on the Lex portal.");
  }

  // Send to broker platform API (uses existing /api/lex-autolease/session endpoint)
  const response = await fetch(`${apiUrl}/api/lex-autolease/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cookies: cookies,
      csrfToken: csrfToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save session");
  }

  const result = await response.json();
  return { success: true, expiresIn: "8 hours", ...result };
}

// Check if we're on the Lex portal when tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes(LEX_DOMAIN)) {
    // Badge to indicate we can capture
    chrome.action.setBadgeText({ text: "!", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#10B981", tabId });
  }
});
