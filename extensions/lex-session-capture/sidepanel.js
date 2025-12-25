document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const captureBtn = document.getElementById('captureBtn');
  const testLoadBtn = document.getElementById('testLoadBtn');
  const testBtn = document.getElementById('testBtn');
  const resultDiv = document.getElementById('result');
  const resultValue = document.getElementById('resultValue');
  const queueSection = document.getElementById('queueSection');
  const queueList = document.getElementById('queueList');
  const queueCount = document.getElementById('queueCount');
  const processQueueBtn = document.getElementById('processQueueBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');

  const API_URL = 'https://splitlease.netlify.app';

  let isPageReady = false;
  let selectedFlagged = new Set(); // Track selected flagged items for rerun

  // Initial check
  await checkPageStatus();
  await checkQueue();

  // Periodically check page status and queue
  setInterval(async () => {
    await checkPageStatus();
    await checkQueue();
  }, 2000);

  async function checkPageStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url?.includes('associate.lexautolease.co.uk')) {
        statusEl.className = 'status warning';
        statusEl.textContent = 'Navigate to associate.lexautolease.co.uk';
        captureBtn.textContent = 'Open Lex Portal';
        captureBtn.disabled = false;
        captureBtn.onclick = () => {
          chrome.tabs.create({ url: 'https://associate.lexautolease.co.uk/QuickQuote.aspx' });
        };
        isPageReady = false;
        testBtn.style.display = 'none';
        return;
      }

      // Check if quote form is ready
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkPageReady' });

      if (response?.ready) {
        statusEl.className = 'status success';
        statusEl.textContent = 'Quote page ready - automation enabled';
        captureBtn.textContent = 'Page Ready ✓';
        captureBtn.disabled = true;
        isPageReady = true;
        testLoadBtn.style.display = 'block';
        testBtn.style.display = 'block';
      } else {
        statusEl.className = 'status info';
        statusEl.textContent = 'Navigate to the Quote page';
        captureBtn.textContent = 'Go to Quote Page';
        captureBtn.disabled = false;
        captureBtn.onclick = () => {
          chrome.tabs.update(tab.id, { url: 'https://associate.lexautolease.co.uk/QuickQuote.aspx' });
        };
        isPageReady = false;
        testLoadBtn.style.display = 'none';
        testBtn.style.display = 'none';
      }
    } catch (e) {
      statusEl.className = 'status info';
      statusEl.textContent = 'Refresh the Lex page';
      captureBtn.textContent = 'Refresh Page';
      captureBtn.disabled = false;
      captureBtn.onclick = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.reload(tab.id);
      };
      isPageReady = false;
      testLoadBtn.style.display = 'none';
      testBtn.style.display = 'none';
    }
  }

  // Handle test load (just make/model/variant, no quote)
  testLoadBtn.addEventListener('click', async () => {
    testLoadBtn.disabled = true;
    testLoadBtn.textContent = 'Loading...';
    statusEl.className = 'status info';
    statusEl.textContent = 'Loading vehicle in form...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testLoadVehicle',
        data: {
          makeId: '18',      // BMW
          modelId: '6',      // 3 Series
          variantId: '391'   // Variant
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.success) {
        statusEl.className = 'status success';
        statusEl.textContent = `Loaded: ${response.make} ${response.model} - ${response.variant}`;
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Load failed: ${error.message}`;
    }

    testLoadBtn.disabled = false;
    testLoadBtn.textContent = 'Test Load Vehicle (BMW 3 Series)';
  });

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
        statusEl.textContent = 'Test quote completed!';
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Quote failed: ${error.message}`;
    }

    testBtn.disabled = false;
    testBtn.textContent = 'Test Quote (Abarth 500e)';
  });

  // Process queue button
  processQueueBtn.addEventListener('click', async () => {
    processQueueBtn.disabled = true;
    processQueueBtn.textContent = 'Processing...';
    statusEl.className = 'status info';
    statusEl.textContent = 'Processing queue - watch the page...';
    progressContainer.style.display = 'block';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'processQueue'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      statusEl.className = 'status success';
      statusEl.textContent = `Done! ${response.processed} quotes processed, ${response.errors} errors`;
      progressFill.style.width = '100%';

      // Refresh queue display
      await checkQueue();
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Failed: ${error.message}`;
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
        const errors = data.queue.filter(q => q.status === 'error').length;
        const flagged = data.queue.filter(q => q.status === 'flagged').length;
        const total = data.queue.length;

        // Update progress bar
        const processed = complete + errors + flagged;
        if (processed > 0 || running > 0) {
          progressContainer.style.display = 'block';
          progressFill.style.width = `${(processed / total) * 100}%`;
        } else {
          progressContainer.style.display = 'none';
        }

        let countText = [];
        if (pending > 0) countText.push(`${pending} pending`);
        if (running > 0) countText.push(`${running} running`);
        if (complete > 0) countText.push(`${complete} done`);
        if (flagged > 0) countText.push(`${flagged} flagged`);
        if (errors > 0) countText.push(`${errors} failed`);
        queueCount.textContent = countText.join(' • ');

        // Render queue items
        queueList.innerHTML = data.queue.map(item => {
          const isFlagged = item.status === 'flagged' && item.fleetMarque?.hasLowerPrice;
          const isSelected = selectedFlagged.has(item.vehicleId);

          return `
            <div class="queue-item ${isFlagged ? 'flagged' : ''} ${isSelected ? 'selected' : ''}"
                 ${isFlagged ? `data-vehicle-id="${item.vehicleId}"` : ''}>
              <div class="vehicle">
                ${isFlagged ? `<input type="checkbox" class="fm-checkbox" data-id="${item.vehicleId}" ${isSelected ? 'checked' : ''}>` : ''}
                ${item.manufacturer} ${item.model}
              </div>
              <div class="config">${item.term}mo • ${item.mileage.toLocaleString()}mi • CO2: ${item.co2 ?? 'N/A'}</div>
              ${isFlagged ? `
                <div class="fm-alert">
                  🏷️ Fleet Marque: £${(item.fleetMarque.discountedPrice / 100).toFixed(2)}
                  <span class="savings">(save £${(item.fleetMarque.savings / 100).toFixed(2)})</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                <span class="status-badge ${item.status}">${item.status}</span>
                ${(item.status === 'complete' || item.status === 'flagged') && item.result ?
                  `<span class="price">£${item.result.monthlyRental?.toFixed(2)}/mo</span>` :
                  ''}
                ${item.status === 'error' ?
                  `<span class="error-text" title="${item.error || 'Unknown error'}">⚠️ ${(item.error || 'Error').substring(0, 30)}</span>` :
                  ''}
              </div>
            </div>
          `;
        }).join('');

        // Add click handlers for checkboxes
        queueList.querySelectorAll('.fm-checkbox').forEach(checkbox => {
          checkbox.addEventListener('change', (e) => {
            const vehicleId = e.target.dataset.id;
            if (e.target.checked) {
              selectedFlagged.add(vehicleId);
            } else {
              selectedFlagged.delete(vehicleId);
            }
            updateRerunButton();
          });
        });

        // Show process button if ready
        if (pending > 0 && isPageReady) {
          processQueueBtn.style.display = 'block';
          processQueueBtn.textContent = `Process ${pending} Quote${pending > 1 ? 's' : ''}`;
          processQueueBtn.disabled = false;
        } else if (pending > 0) {
          processQueueBtn.style.display = 'block';
          processQueueBtn.textContent = 'Go to Quote page first';
          processQueueBtn.disabled = true;
        } else {
          processQueueBtn.style.display = 'none';
        }

        updateRerunButton();
      } else {
        queueSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to check queue:', error);
    }
  }

  // Update rerun button visibility
  function updateRerunButton() {
    let rerunBtn = document.getElementById('rerunFmBtn');
    if (selectedFlagged.size > 0) {
      if (!rerunBtn) {
        rerunBtn = document.createElement('button');
        rerunBtn.id = 'rerunFmBtn';
        rerunBtn.className = 'primary';
        rerunBtn.style.marginTop = '8px';
        rerunBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        queueSection.appendChild(rerunBtn);
        rerunBtn.addEventListener('click', rerunWithFleetMarque);
      }
      rerunBtn.textContent = `Rerun ${selectedFlagged.size} with Fleet Marque`;
      rerunBtn.style.display = 'block';
    } else if (rerunBtn) {
      rerunBtn.style.display = 'none';
    }
  }

  // Rerun selected items with Fleet Marque pricing
  async function rerunWithFleetMarque() {
    const vehicleIds = Array.from(selectedFlagged);
    if (vehicleIds.length === 0) return;

    const rerunBtn = document.getElementById('rerunFmBtn');
    rerunBtn.disabled = true;
    rerunBtn.textContent = 'Queueing...';

    try {
      const response = await fetch(`${API_URL}/api/lex-autolease/quote-queue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleIds })
      });

      const data = await response.json();

      if (data.success) {
        statusEl.className = 'status success';
        statusEl.textContent = `${data.updated} items queued for rerun with FM pricing`;
        selectedFlagged.clear();
        await checkQueue();
      } else {
        throw new Error(data.error || 'Failed to queue reruns');
      }
    } catch (error) {
      statusEl.className = 'status error';
      statusEl.textContent = `Rerun failed: ${error.message}`;
    }

    rerunBtn.disabled = false;
    updateRerunButton();
  }
});
