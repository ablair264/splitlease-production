document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const captureBtn = document.getElementById('captureBtn');

  // Check if we're on the Lex portal
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url?.includes('associate.lexautolease.co.uk')) {
    statusEl.className = 'status warning';
    statusEl.textContent = 'Go to associate.lexautolease.co.uk first';
    return;
  }

  // We're on Lex portal - enable capture
  statusEl.className = 'status info';
  statusEl.textContent = 'Navigate to Quote page, then click Capture';
  captureBtn.disabled = false;

  // Handle capture
  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    captureBtn.textContent = 'Capturing...';
    statusEl.className = 'status info';
    statusEl.textContent = 'Getting cookies...';

    try {
      // Get cookies for the Lex domain
      const cookies = await chrome.cookies.getAll({
        domain: 'associate.lexautolease.co.uk'
      });

      const cookieString = cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

      if (!cookieString) {
        throw new Error('No cookies found - are you logged in?');
      }

      statusEl.textContent = 'Getting CSRF token...';

      // Inject script to get CSRF token and profile from page
      // Use MAIN world to access page's window variables
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: () => {
          // Try multiple ways to find CSRF token
          let csrfToken = window.lexCsrfToken || window.csrf_token;

          // Check other possible locations
          if (!csrfToken && window.__csrf) csrfToken = window.__csrf;

          return {
            csrfToken: csrfToken || null,
            profile: window.profile || {}
          };
        }
      });

      const pageData = result.result;

      if (!pageData.csrfToken) {
        throw new Error('CSRF token not found. Go to Quote page first, then try again.');
      }

      statusEl.textContent = 'Sending to SplitLease...';

      // Send to background script (bypasses page CSP)
      const response = await chrome.runtime.sendMessage({
        action: 'captureSession',
        data: {
          csrfToken: pageData.csrfToken,
          cookies: cookieString,
          profile: pageData.profile
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.success) {
        statusEl.className = 'status success';
        statusEl.innerHTML = `✅ Captured!<br>Expires: ${new Date(response.expiresAt).toLocaleString()}`;
        captureBtn.textContent = 'Done!';
      } else {
        throw new Error('Unexpected response');
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `❌ ${error.message}`;
      captureBtn.disabled = false;
      captureBtn.textContent = 'Retry';
    }
  });
});
