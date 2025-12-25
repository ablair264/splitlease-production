document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const captureBtn = document.getElementById('captureBtn');
  const testBtn = document.getElementById('testBtn');
  const resultDiv = document.getElementById('result');
  const resultValue = document.getElementById('resultValue');
  const queueSection = document.getElementById('queueSection');
  const queueList = document.getElementById('queueList');
  const queueCount = document.getElementById('queueCount');
  const processQueueBtn = document.getElementById('processQueueBtn');

  const API_URL = 'https://splitlease.netlify.app';

  // Check if we're on the Lex portal
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url?.includes('associate.lexautolease.co.uk')) {
    statusEl.className = 'status warning';
    statusEl.textContent = 'Go to associate.lexautolease.co.uk first';
    captureBtn.textContent = 'Open Lex Portal';
    captureBtn.disabled = false;
    captureBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://associate.lexautolease.co.uk/QuickQuote.aspx' });
    });

    // Still check queue even if not on Lex site
    await checkQueue();
    return;
  }

  // Check if we're on the quote page (has the form)
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkPageReady' });

    if (response?.ready) {
      statusEl.className = 'status success';
      statusEl.textContent = 'Quote page ready! You can run quotes.';
      testBtn.style.display = 'block';
      captureBtn.textContent = 'Page Ready ✓';
      captureBtn.disabled = true;
    } else {
      statusEl.className = 'status info';
      statusEl.textContent = 'Navigate to the Quote page';
      captureBtn.textContent = 'Go to Quote Page';
      captureBtn.disabled = false;
      captureBtn.addEventListener('click', () => {
        chrome.tabs.update(tab.id, { url: 'https://associate.lexautolease.co.uk/QuickQuote.aspx' });
        window.close();
      });
    }
  } catch (e) {
    // Content script might not be loaded yet
    statusEl.className = 'status info';
    statusEl.textContent = 'Refresh the page and try again';
    captureBtn.textContent = 'Refresh Page';
    captureBtn.disabled = false;
    captureBtn.addEventListener('click', () => {
      chrome.tabs.reload(tab.id);
      window.close();
    });
  }

  // Check for pending queue
  await checkQueue();

  // Handle test quote
  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.textContent = 'Running...';
    resultDiv.style.display = 'none';
    statusEl.className = 'status info';
    statusEl.textContent = 'Automating quote form...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'runQuote',
        data: {
          makeId: '18',      // BMW
          modelId: '6',      // 3 Series
          variantId: '391',  // Variant
          term: 36,
          mileage: 10000,
          paymentPlan: 'spread_3_down',
          contractType: 'contract_hire_without_maintenance',
          co2: 130
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.success) {
        resultDiv.style.display = 'block';
        resultValue.textContent = response.monthlyRental
          ? `£${response.monthlyRental.toFixed(2)}/mo`
          : `Quote #${response.quoteId || 'Complete'}`;
        statusEl.className = 'status success';
        statusEl.textContent = 'Quote completed successfully!';
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Quote failed: ${error.message}`;
    }

    testBtn.disabled = false;
    testBtn.textContent = 'Test Quote (BMW 3 Series)';
  });

  // Process queue button
  processQueueBtn.addEventListener('click', async () => {
    processQueueBtn.disabled = true;
    processQueueBtn.textContent = 'Processing...';
    statusEl.className = 'status info';
    statusEl.textContent = 'Processing queue - watch the page...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'processQueue'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      statusEl.className = 'status success';
      statusEl.textContent = `Processed ${response.processed} quotes!`;

      // Refresh queue display
      await checkQueue();
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Queue processing failed: ${error.message}`;
    }

    processQueueBtn.disabled = false;
    processQueueBtn.textContent = 'Process Queue';
  });

  // Check queue function
  async function checkQueue() {
    try {
      // Add cache-busting timestamp
      const response = await fetch(`${API_URL}/api/lex-autolease/quote-queue?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();

      if (data.queue && data.queue.length > 0) {
        queueSection.style.display = 'block';

        const pending = data.queue.filter(q => q.status === 'pending').length;
        const complete = data.queue.filter(q => q.status === 'complete').length;
        const running = data.queue.filter(q => q.status === 'running').length;

        let countText = `${pending} pending`;
        if (running > 0) countText += `, ${running} running`;
        if (complete > 0) countText += `, ${complete} complete`;
        queueCount.textContent = countText;

        // Render queue items
        queueList.innerHTML = data.queue.map(item => `
          <div class="queue-item">
            <div class="vehicle">${item.manufacturer} ${item.model}</div>
            <div class="config">${item.term}mo • ${item.mileage.toLocaleString()}mi</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="status-badge ${item.status}">${item.status}</span>
              ${item.status === 'complete' && item.result ?
                `<span class="price">£${item.result.monthlyRental?.toFixed(2)}/mo</span>` :
                ''}
              ${item.status === 'error' ?
                `<span class="error-text" title="${item.error || 'Unknown error'}">⚠️</span>` :
                ''}
            </div>
          </div>
        `).join('');

        // Show process button if there are pending items and we're on the quote page
        if (pending > 0) {
          try {
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (currentTab.url?.includes('associate.lexautolease.co.uk')) {
              const pageCheck = await chrome.tabs.sendMessage(currentTab.id, { action: 'checkPageReady' });
              if (pageCheck?.ready) {
                processQueueBtn.style.display = 'block';
                processQueueBtn.textContent = `Process ${pending} Quote${pending > 1 ? 's' : ''}`;
              } else {
                processQueueBtn.style.display = 'none';
              }
            } else {
              processQueueBtn.style.display = 'none';
            }
          } catch (e) {
            processQueueBtn.style.display = 'none';
          }
        } else {
          processQueueBtn.style.display = 'none';
        }
      } else {
        queueSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to check queue:', error);
    }
  }

  // Poll for queue updates
  setInterval(checkQueue, 3000);
});
