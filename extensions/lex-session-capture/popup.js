document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const captureBtn = document.getElementById('captureBtn');
  const testBtn = document.getElementById('testBtn');
  const resultDiv = document.getElementById('result');
  const resultValue = document.getElementById('resultValue');

  // Check if we're on the Lex portal
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url?.includes('associate.lexautolease.co.uk')) {
    statusEl.className = 'status warning';
    statusEl.textContent = 'Go to associate.lexautolease.co.uk first';
    return;
  }

  // Check if we have a session stored
  const sessionData = await chrome.runtime.sendMessage({ action: 'getSessionData' });

  if (sessionData?.csrfToken) {
    statusEl.className = 'status success';
    statusEl.textContent = 'Session ready! You can run quotes.';
    testBtn.style.display = 'block';
  } else {
    statusEl.className = 'status info';
    statusEl.textContent = 'Navigate to Quote page, then click Capture';
  }

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
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: () => {
          let csrfToken = window.lexCsrfToken || window.csrf_token;
          if (!csrfToken && window.__csrf) csrfToken = window.__csrf;
          return {
            csrfToken: csrfToken || null,
            profile: window.profile || {}
          };
        }
      });

      const pageData = result.result;

      if (!pageData.csrfToken) {
        throw new Error('CSRF token not found. Go to Quote page first.');
      }

      statusEl.textContent = 'Saving session...';

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
        statusEl.textContent = 'Session captured! You can run quotes now.';
        captureBtn.textContent = 'Recapture Session';
        testBtn.style.display = 'block';
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `❌ ${error.message}`;
      captureBtn.textContent = 'Retry';
    }

    captureBtn.disabled = false;
  });

  // Handle test quote
  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.textContent = 'Running...';
    resultDiv.style.display = 'none';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'runQuote',
        data: {
          makeId: '75',      // Abarth
          modelId: '1',      // 500
          variantId: '21',   // Electric Hatchback
          term: 36,
          mileage: 10000,
          paymentPlan: 'spread_3_down',
          contractType: 'contract_hire_without_maintenance'
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.success) {
        resultDiv.style.display = 'block';
        resultValue.textContent = `£${response.monthlyRental?.toFixed(2)}/mo`;
        statusEl.className = 'status success';
        statusEl.textContent = 'Quote retrieved successfully!';
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Quote failed: ${error.message}`;
    }

    testBtn.disabled = false;
    testBtn.textContent = 'Test Quote (Abarth 500e)';
  });
});
