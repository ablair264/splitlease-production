// Popup script for Lex Session Capture

const LEX_DOMAIN = "associate.lexautolease.co.uk";

// DOM elements
const portalStatus = document.getElementById("portalStatus");
const cookieStatus = document.getElementById("cookieStatus");
const csrfStatus = document.getElementById("csrfStatus");
const apiUrlInput = document.getElementById("apiUrl");
const captureBtn = document.getElementById("captureBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const messageDiv = document.getElementById("message");

// State
let pageData = null;
let cookies = null;

// Load saved API URL
chrome.storage.local.get(["apiUrl"], (result) => {
  if (result.apiUrl) {
    apiUrlInput.value = result.apiUrl;
  }
});

// Save API URL on change
apiUrlInput.addEventListener("change", () => {
  chrome.storage.local.set({ apiUrl: apiUrlInput.value });
});

// Update status display
function updateStatus(element, status, text) {
  const dotClass = status === "success" ? "success" : status === "error" ? "error" : "warning";
  element.innerHTML = `<span class="dot ${dotClass}"></span>${text}`;
  element.className = `status-value ${status}`;
}

// Show message
function showMessage(type, text) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
}

// Check status
async function checkStatus() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isOnLex = tab?.url?.includes(LEX_DOMAIN);

  // Update portal status
  if (isOnLex) {
    updateStatus(portalStatus, "success", "Connected");
  } else {
    updateStatus(portalStatus, "error", "Not on Lex portal");
  }

  // Get cookies
  try {
    const response = await chrome.runtime.sendMessage({ action: "getCookies" });
    cookies = response;

    if (response.cookies && response.cookies.length > 0) {
      const cookieCount = response.cookieList?.length || 0;
      updateStatus(cookieStatus, "success", `${cookieCount} cookies`);
    } else {
      updateStatus(cookieStatus, "error", "No cookies");
    }
  } catch (error) {
    updateStatus(cookieStatus, "error", "Error");
  }

  // Get page data (CSRF token)
  if (isOnLex && tab?.id) {
    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { action: "getPageData" });

      if (pageData?.csrfToken) {
        updateStatus(csrfStatus, "success", "Found");
      } else {
        updateStatus(csrfStatus, "warning", "Not found");
      }

      if (pageData?.isLoggedIn === false) {
        updateStatus(portalStatus, "warning", "Not logged in");
      }
    } catch (error) {
      // Content script might not be loaded
      updateStatus(csrfStatus, "warning", "Refresh page");
    }
  } else {
    updateStatus(csrfStatus, "error", "N/A");
  }

  // Enable/disable capture button
  const canCapture = isOnLex && cookies?.cookies && pageData?.csrfToken;
  captureBtn.disabled = !canCapture;
}

// Capture session
async function captureSession() {
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, "");

  if (!apiUrl) {
    showMessage("error", "Please enter the Broker Platform URL");
    return;
  }

  if (!cookies?.cookies || !pageData?.csrfToken) {
    showMessage("error", "Missing cookies or CSRF token");
    return;
  }

  // Update UI
  captureBtn.disabled = true;
  btnText.textContent = "Capturing...";
  btnSpinner.style.display = "block";
  messageDiv.className = "message";

  try {
    const response = await chrome.runtime.sendMessage({
      action: "captureSession",
      csrfToken: pageData.csrfToken,
      apiUrl: apiUrl,
    });

    if (response.success) {
      showMessage("success", `Session captured! Valid for ${response.expiresIn || "24 hours"}`);
    } else {
      showMessage("error", response.error || "Failed to capture session");
    }
  } catch (error) {
    showMessage("error", error.message || "Failed to capture session");
  } finally {
    captureBtn.disabled = false;
    btnText.textContent = "Capture Session";
    btnSpinner.style.display = "none";
  }
}

// Event listeners
captureBtn.addEventListener("click", captureSession);

// Initial check
checkStatus();

// Re-check when popup opens (tab might have changed)
setInterval(checkStatus, 2000);
