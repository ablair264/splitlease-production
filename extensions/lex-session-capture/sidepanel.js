document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'https://splitlease.netlify.app';

  // Provider tabs
  const providerTabs = document.querySelectorAll('.provider-tab');
  const lexSection = document.getElementById('lexSection');
  const drivaliaSection = document.getElementById('drivaliaSection');
  const lexStatusDot = document.getElementById('lexStatusDot');
  const drivaliaStatusDot = document.getElementById('drivaliaStatusDot');

  // Lex elements
  const lexStatusEl = document.getElementById('lexStatus');
  const lexCaptureBtn = document.getElementById('lexCaptureBtn');
  const testLoadBtn = document.getElementById('testLoadBtn');
  const testBtn = document.getElementById('testBtn');
  const lexResultDiv = document.getElementById('lexResult');
  const lexResultValue = document.getElementById('lexResultValue');
  const lexQueueSection = document.getElementById('lexQueueSection');
  const lexQueueList = document.getElementById('lexQueueList');
  const lexQueueCount = document.getElementById('lexQueueCount');
  const lexProcessQueueBtn = document.getElementById('lexProcessQueueBtn');
  const lexProgressContainer = document.getElementById('lexProgressContainer');
  const lexProgressFill = document.getElementById('lexProgressFill');

  // Drivalia elements
  const drivaliaStatusEl = document.getElementById('drivaliaStatus');
  const drivaliaCaptureBtn = document.getElementById('drivaliaCaptureBtn');
  const drivaliaResultDiv = document.getElementById('drivaliaResult');
  const drivaliaResultValue = document.getElementById('drivaliaResultValue');
  const drivaliaQueueSection = document.getElementById('drivaliaQueueSection');
  const drivaliaQueueList = document.getElementById('drivaliaQueueList');
  const drivaliaQueueCount = document.getElementById('drivaliaQueueCount');
  const drivaliaProcessQueueBtn = document.getElementById('drivaliaProcessQueueBtn');
  const drivaliaProgressContainer = document.getElementById('drivaliaProgressContainer');
  const drivaliaProgressFill = document.getElementById('drivaliaProgressFill');

  let currentProvider = 'lex';
  let isLexReady = false;
  let isDrivaliaReady = false;
  let selectedFlagged = new Set();

  // Tab switching
  providerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const provider = tab.dataset.provider;
      currentProvider = provider;

      providerTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      lexSection.classList.toggle('active', provider === 'lex');
      drivaliaSection.classList.toggle('active', provider === 'drivalia');
    });
  });

  // Initial check
  await checkAllProviders();
  await checkLexQueue();
  await checkDrivaliaQueue();

  // Periodically check (5 seconds to avoid Chrome throttling)
  setInterval(async () => {
    await checkAllProviders();
    await checkLexQueue();
    await checkDrivaliaQueue();
  }, 5000);

  // Check both providers status
  async function checkAllProviders() {
    await checkLexPageStatus();
    await checkDrivaliaPageStatus();
  }

  // ==================== LEX ====================

  async function checkLexPageStatus() {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://associate.lexautolease.co.uk/*' });

      if (tabs.length === 0) {
        lexStatusEl.className = 'status warning';
        lexStatusEl.textContent = 'No Lex portal tab open';
        lexCaptureBtn.textContent = 'Open Lex Portal';
        lexCaptureBtn.disabled = false;
        lexCaptureBtn.onclick = () => {
          chrome.tabs.create({ url: 'https://associate.lexautolease.co.uk/QuickQuote.aspx' });
        };
        isLexReady = false;
        lexStatusDot.classList.remove('ready');
        testBtn.style.display = 'none';
        testLoadBtn.style.display = 'none';
        return;
      }

      // Check if quote form is ready
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'checkPageReady' });

        if (response?.ready) {
          lexStatusEl.className = 'status success';
          lexStatusEl.textContent = 'Quote page ready - automation enabled';
          lexCaptureBtn.textContent = 'Page Ready ✓';
          lexCaptureBtn.disabled = true;
          isLexReady = true;
          lexStatusDot.classList.add('ready');
          testLoadBtn.style.display = 'block';
          testBtn.style.display = 'block';
        } else {
          lexStatusEl.className = 'status info';
          lexStatusEl.textContent = 'Navigate to the Quote page';
          lexCaptureBtn.textContent = 'Go to Quote Page';
          lexCaptureBtn.disabled = false;
          lexCaptureBtn.onclick = () => {
            chrome.tabs.update(tabs[0].id, { url: 'https://associate.lexautolease.co.uk/QuickQuote.aspx' });
          };
          isLexReady = false;
          lexStatusDot.classList.remove('ready');
          testLoadBtn.style.display = 'none';
          testBtn.style.display = 'none';
        }
      } catch (e) {
        lexStatusEl.className = 'status info';
        lexStatusEl.textContent = 'Refresh the Lex page';
        lexCaptureBtn.textContent = 'Refresh Page';
        lexCaptureBtn.disabled = false;
        lexCaptureBtn.onclick = () => {
          chrome.tabs.reload(tabs[0].id);
        };
        isLexReady = false;
        lexStatusDot.classList.remove('ready');
        testLoadBtn.style.display = 'none';
        testBtn.style.display = 'none';
      }
    } catch (e) {
      console.error('Lex status check failed:', e);
    }
  }

  // Handle test load
  testLoadBtn.addEventListener('click', async () => {
    testLoadBtn.disabled = true;
    testLoadBtn.textContent = 'Loading...';
    lexStatusEl.className = 'status info';
    lexStatusEl.textContent = 'Loading vehicle in form...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testLoadVehicle',
        data: {
          makeId: '18',
          modelId: '6',
          variantId: '391'
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.success) {
        lexStatusEl.className = 'status success';
        lexStatusEl.textContent = `Loaded: ${response.make} ${response.model} - ${response.variant}`;
      }
    } catch (error) {
      lexStatusEl.className = 'status error';
      lexStatusEl.textContent = `Load failed: ${error.message}`;
    }

    testLoadBtn.disabled = false;
    testLoadBtn.textContent = 'Test Load Vehicle (BMW 3 Series)';
  });

  // Handle test quote
  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.textContent = 'Running...';
    lexResultDiv.style.display = 'none';
    lexStatusEl.className = 'status info';
    lexStatusEl.textContent = 'Automating quote form...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'runQuote',
        data: {
          makeId: '18',
          modelId: '6',
          variantId: '391',
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
        lexResultDiv.style.display = 'block';
        lexResultValue.textContent = response.monthlyRental
          ? `£${response.monthlyRental.toFixed(2)}/mo`
          : `Quote #${response.quoteId || 'Complete'}`;
        lexStatusEl.className = 'status success';
        lexStatusEl.textContent = 'Test quote completed!';
      }
    } catch (error) {
      lexStatusEl.className = 'status error';
      lexStatusEl.textContent = `Quote failed: ${error.message}`;
    }

    testBtn.disabled = false;
    testBtn.textContent = 'Test Full Quote (BMW 3 Series)';
  });

  // Process Lex queue
  lexProcessQueueBtn.addEventListener('click', async () => {
    lexProcessQueueBtn.disabled = true;
    lexProcessQueueBtn.textContent = 'Processing...';
    lexStatusEl.className = 'status info';
    lexStatusEl.textContent = 'Processing queue - watch the page...';
    lexProgressContainer.style.display = 'block';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'processQueue'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      lexStatusEl.className = 'status success';
      lexStatusEl.textContent = `Done! ${response.processed} quotes processed, ${response.errors} errors`;
      lexProgressFill.style.width = '100%';

      await checkLexQueue();
    } catch (error) {
      lexStatusEl.className = 'status error';
      lexStatusEl.textContent = `Failed: ${error.message}`;
    }

    lexProcessQueueBtn.disabled = false;
    lexProcessQueueBtn.textContent = 'Process Queue';
  });

  // Check Lex queue
  async function checkLexQueue() {
    try {
      const response = await fetch(`${API_URL}/api/lex-autolease/quote-queue?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();

      if (data.queue && data.queue.length > 0) {
        lexQueueSection.style.display = 'block';

        const pending = data.queue.filter(q => q.status === 'pending').length;
        const complete = data.queue.filter(q => q.status === 'complete').length;
        const running = data.queue.filter(q => q.status === 'running').length;
        const errors = data.queue.filter(q => q.status === 'error').length;
        const flagged = data.queue.filter(q => q.status === 'flagged').length;
        const total = data.queue.length;

        const processed = complete + errors + flagged;
        if (processed > 0 || running > 0) {
          lexProgressContainer.style.display = 'block';
          lexProgressFill.style.width = `${(processed / total) * 100}%`;
        } else {
          lexProgressContainer.style.display = 'none';
        }

        let countText = [];
        if (pending > 0) countText.push(`${pending} pending`);
        if (running > 0) countText.push(`${running} running`);
        if (complete > 0) countText.push(`${complete} done`);
        if (flagged > 0) countText.push(`${flagged} flagged`);
        if (errors > 0) countText.push(`${errors} failed`);
        lexQueueCount.textContent = countText.join(' • ');

        lexQueueList.innerHTML = data.queue.map(item => {
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

        // Add checkbox handlers
        lexQueueList.querySelectorAll('.fm-checkbox').forEach(checkbox => {
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

        if (pending > 0 && isLexReady) {
          lexProcessQueueBtn.style.display = 'block';
          lexProcessQueueBtn.textContent = `Process ${pending} Quote${pending > 1 ? 's' : ''}`;
          lexProcessQueueBtn.disabled = false;
        } else if (pending > 0) {
          lexProcessQueueBtn.style.display = 'block';
          lexProcessQueueBtn.textContent = 'Go to Quote page first';
          lexProcessQueueBtn.disabled = true;
        } else {
          lexProcessQueueBtn.style.display = 'none';
        }

        updateRerunButton();
      } else {
        lexQueueSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to check Lex queue:', error);
    }
  }

  function updateRerunButton() {
    let rerunBtn = document.getElementById('rerunFmBtn');
    if (selectedFlagged.size > 0) {
      if (!rerunBtn) {
        rerunBtn = document.createElement('button');
        rerunBtn.id = 'rerunFmBtn';
        rerunBtn.className = 'primary';
        rerunBtn.style.marginTop = '8px';
        rerunBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        lexQueueSection.appendChild(rerunBtn);
        rerunBtn.addEventListener('click', rerunWithFleetMarque);
      }
      rerunBtn.textContent = `Rerun ${selectedFlagged.size} with Fleet Marque`;
      rerunBtn.style.display = 'block';
    } else if (rerunBtn) {
      rerunBtn.style.display = 'none';
    }
  }

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
        lexStatusEl.className = 'status success';
        lexStatusEl.textContent = `${data.updated} items queued for rerun with FM pricing`;
        selectedFlagged.clear();
        await checkLexQueue();
      } else {
        throw new Error(data.error || 'Failed to queue reruns');
      }
    } catch (error) {
      lexStatusEl.className = 'status error';
      lexStatusEl.textContent = `Rerun failed: ${error.message}`;
    }

    rerunBtn.disabled = false;
    updateRerunButton();
  }

  // ==================== DRIVALIA ====================

  async function checkDrivaliaPageStatus() {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://www.caafgenus3.co.uk/*' });

      if (tabs.length === 0) {
        drivaliaStatusEl.className = 'status warning';
        drivaliaStatusEl.textContent = 'No Drivalia portal tab open';
        drivaliaCaptureBtn.textContent = 'Open Drivalia Portal';
        drivaliaCaptureBtn.disabled = false;
        drivaliaCaptureBtn.onclick = () => {
          chrome.tabs.create({ url: 'https://www.caafgenus3.co.uk/WebApp/fmoportal/index.html#/quoting/new' });
        };
        isDrivaliaReady = false;
        drivaliaStatusDot.classList.remove('ready');
        return;
      }

      // Check if quote form is ready
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'checkDrivaliaPageReady' });

        if (response?.ready) {
          drivaliaStatusEl.className = 'status success';
          drivaliaStatusEl.textContent = 'Quote page ready - automation enabled';
          drivaliaCaptureBtn.textContent = 'Page Ready ✓';
          drivaliaCaptureBtn.disabled = true;
          isDrivaliaReady = true;
          drivaliaStatusDot.classList.add('ready');
        } else {
          drivaliaStatusEl.className = 'status info drivalia';
          drivaliaStatusEl.textContent = 'Navigate to the New Quote page';
          drivaliaCaptureBtn.textContent = 'Go to Quote Page';
          drivaliaCaptureBtn.disabled = false;
          drivaliaCaptureBtn.onclick = () => {
            chrome.tabs.update(tabs[0].id, { url: 'https://www.caafgenus3.co.uk/WebApp/fmoportal/index.html#/quoting/new' });
          };
          isDrivaliaReady = false;
          drivaliaStatusDot.classList.remove('ready');
        }
      } catch (e) {
        drivaliaStatusEl.className = 'status info drivalia';
        drivaliaStatusEl.textContent = 'Refresh the Drivalia page';
        drivaliaCaptureBtn.textContent = 'Refresh Page';
        drivaliaCaptureBtn.disabled = false;
        drivaliaCaptureBtn.onclick = () => {
          chrome.tabs.reload(tabs[0].id);
        };
        isDrivaliaReady = false;
        drivaliaStatusDot.classList.remove('ready');
      }
    } catch (e) {
      console.error('Drivalia status check failed:', e);
    }
  }

  // Process Drivalia queue
  drivaliaProcessQueueBtn.addEventListener('click', async () => {
    drivaliaProcessQueueBtn.disabled = true;
    drivaliaProcessQueueBtn.textContent = 'Processing...';
    drivaliaStatusEl.className = 'status info drivalia';
    drivaliaStatusEl.textContent = 'Processing queue - watch the page...';
    drivaliaProgressContainer.style.display = 'block';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'processDrivaliaQueue'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      drivaliaStatusEl.className = 'status success';
      drivaliaStatusEl.textContent = `Done! ${response.processed} quotes processed, ${response.errors} errors`;
      drivaliaProgressFill.style.width = '100%';

      await checkDrivaliaQueue();
    } catch (error) {
      drivaliaStatusEl.className = 'status error';
      drivaliaStatusEl.textContent = `Failed: ${error.message}`;
    }

    drivaliaProcessQueueBtn.disabled = false;
    drivaliaProcessQueueBtn.textContent = 'Process Queue';
  });

  // Check Drivalia queue
  async function checkDrivaliaQueue() {
    try {
      const response = await fetch(`${API_URL}/api/drivalia/quote-queue?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();

      if (data.queue && data.queue.length > 0) {
        drivaliaQueueSection.style.display = 'block';

        const pending = data.queue.filter(q => q.status === 'pending').length;
        const complete = data.queue.filter(q => q.status === 'complete').length;
        const running = data.queue.filter(q => q.status === 'running').length;
        const errors = data.queue.filter(q => q.status === 'error').length;
        const total = data.queue.length;

        const processed = complete + errors;
        if (processed > 0 || running > 0) {
          drivaliaProgressContainer.style.display = 'block';
          drivaliaProgressFill.style.width = `${(processed / total) * 100}%`;
        } else {
          drivaliaProgressContainer.style.display = 'none';
        }

        let countText = [];
        if (pending > 0) countText.push(`${pending} pending`);
        if (running > 0) countText.push(`${running} running`);
        if (complete > 0) countText.push(`${complete} done`);
        if (errors > 0) countText.push(`${errors} failed`);
        drivaliaQueueCount.textContent = countText.join(' • ');

        drivaliaQueueList.innerHTML = data.queue.map(item => `
          <div class="queue-item">
            <div class="vehicle">${item.manufacturer || ''} ${item.model || ''}</div>
            <div class="config">
              ${item.capCode ? `CAP: ${item.capCode} • ` : ''}
              ${item.term}mo • ${item.mileage?.toLocaleString() || 0}mi
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
              <span class="status-badge ${item.status}">${item.status}</span>
              ${item.status === 'complete' && item.result ?
                `<span class="price">£${item.result.monthlyRental?.toFixed(2)}/mo</span>` :
                ''}
              ${item.status === 'error' ?
                `<span class="error-text" title="${item.error || 'Unknown error'}">⚠️ ${(item.error || 'Error').substring(0, 30)}</span>` :
                ''}
            </div>
          </div>
        `).join('');

        if (pending > 0 && isDrivaliaReady) {
          drivaliaProcessQueueBtn.style.display = 'block';
          drivaliaProcessQueueBtn.textContent = `Process ${pending} Quote${pending > 1 ? 's' : ''}`;
          drivaliaProcessQueueBtn.disabled = false;
        } else if (pending > 0) {
          drivaliaProcessQueueBtn.style.display = 'block';
          drivaliaProcessQueueBtn.textContent = 'Go to Quote page first';
          drivaliaProcessQueueBtn.disabled = true;
        } else {
          drivaliaProcessQueueBtn.style.display = 'none';
        }
      } else {
        drivaliaQueueSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to check Drivalia queue:', error);
    }
  }
});
