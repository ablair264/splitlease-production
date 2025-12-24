// Content script for Lex Autolease pages
// Extracts CSRF token from the page

(function() {
  // Function to extract CSRF token
  function extractCsrfToken() {
    // Method 1: Check window.csrf_token directly (Lex uses this)
    // We need to inject a script to access window variables
    const result = { token: null };

    // Try to get from inline scripts first
    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      const content = script.textContent || "";

      // Look for window.csrf_token = "..." or csrf_token = "..."
      const windowCsrfMatch = content.match(/window\.csrf_token\s*=\s*["']([^"']+)["']/);
      if (windowCsrfMatch) {
        return windowCsrfMatch[1];
      }

      const csrfMatch = content.match(/csrf_token\s*[=:]\s*["']([^"']+)["']/);
      if (csrfMatch) {
        return csrfMatch[1];
      }

      // Look for csrfCheck or x-csrf-check patterns
      const headerMatch = content.match(/["']x-csrf-check["']\s*[,:]\s*["']([^"']+)["']/i);
      if (headerMatch) {
        return headerMatch[1];
      }
    }

    // Method 2: Check meta tag
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
      return metaToken.getAttribute("content");
    }

    // Method 3: Check hidden input
    const inputToken = document.querySelector('input[name="__RequestVerificationToken"]');
    if (inputToken) {
      return inputToken.value;
    }

    // Method 4: Inject script to read window.csrf_token
    // Create a script element that reads the value and stores it in a data attribute
    try {
      const injectedScript = document.createElement('script');
      injectedScript.textContent = `
        if (window.csrf_token) {
          document.body.setAttribute('data-csrf-token', window.csrf_token);
        }
      `;
      document.body.appendChild(injectedScript);
      injectedScript.remove();

      const bodyToken = document.body.getAttribute('data-csrf-token');
      if (bodyToken) {
        document.body.removeAttribute('data-csrf-token');
        return bodyToken;
      }
    } catch (e) {
      console.log('Could not inject script to read csrf_token');
    }

    return null;
  }

  // Function to get user info from page
  function extractUserInfo() {
    // Try to find user info in the page
    const userElement = document.querySelector(".user-name, .username, [data-user-name]");
    if (userElement) {
      return userElement.textContent?.trim() || null;
    }

    // Check for profile data in scripts
    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      const content = script.textContent || "";
      const userMatch = content.match(/["']userName["']\s*:\s*["']([^"']+)["']/i);
      if (userMatch) {
        return userMatch[1];
      }
    }

    return null;
  }

  // Store extracted data
  const csrfToken = extractCsrfToken();
  const userName = extractUserInfo();

  // Save to session storage for popup access
  if (csrfToken) {
    sessionStorage.setItem("lexCsrfToken", csrfToken);
  }
  if (userName) {
    sessionStorage.setItem("lexUserName", userName);
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageData") {
      sendResponse({
        csrfToken: extractCsrfToken(),
        userName: extractUserInfo(),
        url: window.location.href,
        isLoggedIn: !window.location.href.includes("/Login") &&
                    !window.location.href.includes("/Account/Login")
      });
      return true;
    }
  });

  // Notify background that we're on the Lex portal
  chrome.runtime.sendMessage({
    action: "lexPageLoaded",
    csrfToken,
    userName,
    url: window.location.href
  });
})();
