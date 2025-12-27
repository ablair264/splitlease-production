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

        // Show Clear Queue button when there are items in queue
        lexClearQueueBtn.style.display = total > 0 ? 'block' : 'none';

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

        // Show Clear Queue button when there are items in queue
        drivaliaClearQueueBtn.style.display = total > 0 ? 'block' : 'none';
      } else {
        drivaliaQueueSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to check Drivalia queue:', error);
    }
  }

  // ==================== VEHICLE BROWSER ====================

  // Vehicle browser state
  const vehicleBrowserState = {
    lex: {
      vehicles: [],
      selected: new Set(),
      page: 1,
      totalPages: 1,
      filters: { manufacturer: '', model: '', search: '' },
      filterOptions: { manufacturers: [], models: [] }
    },
    drivalia: {
      vehicles: [],
      selected: new Set(),
      page: 1,
      totalPages: 1,
      filters: { manufacturer: '', model: '', search: '' },
      filterOptions: { manufacturers: [], models: [] }
    }
  };

  // Vehicle browser elements
  const lexBrowserHeader = document.getElementById('lexBrowserHeader');
  const lexBrowserContent = document.getElementById('lexBrowserContent');
  const lexFilterManufacturer = document.getElementById('lexFilterManufacturer');
  const lexFilterModel = document.getElementById('lexFilterModel');
  const lexFilterSearch = document.getElementById('lexFilterSearch');
  const lexClearQueueBtn = document.getElementById('lexClearQueueBtn');
  const lexVehicleList = document.getElementById('lexVehicleList');
  const lexPageInfo = document.getElementById('lexPageInfo');
  const lexPrevPage = document.getElementById('lexPrevPage');
  const lexNextPage = document.getElementById('lexNextPage');
  const lexSelectedCount = document.getElementById('lexSelectedCount');
  const lexSelectAll = document.getElementById('lexSelectAll');
  const lexAddToQueueBtn = document.getElementById('lexAddToQueueBtn');
  const lexConfigTerm = document.getElementById('lexConfigTerm');
  const lexConfigMileage = document.getElementById('lexConfigMileage');
  const lexConfigContract = document.getElementById('lexConfigContract');

  const drivaliaBrowserHeader = document.getElementById('drivaliaBrowserHeader');
  const drivaliaBrowserContent = document.getElementById('drivaliaBrowserContent');
  const drivaliaFilterManufacturer = document.getElementById('drivaliaFilterManufacturer');
  const drivaliaFilterModel = document.getElementById('drivaliaFilterModel');
  const drivaliaFilterSearch = document.getElementById('drivaliaFilterSearch');
  const drivaliaClearQueueBtn = document.getElementById('drivaliaClearQueueBtn');
  const drivaliaVehicleList = document.getElementById('drivaliaVehicleList');
  const drivaliaPageInfo = document.getElementById('drivaliaPageInfo');
  const drivaliaPrevPage = document.getElementById('drivaliaPrevPage');
  const drivaliaNextPage = document.getElementById('drivaliaNextPage');
  const drivaliaSelectedCount = document.getElementById('drivaliaSelectedCount');
  const drivaliaSelectAll = document.getElementById('drivaliaSelectAll');
  const drivaliaAddToQueueBtn = document.getElementById('drivaliaAddToQueueBtn');
  const drivaliaConfigTerm = document.getElementById('drivaliaConfigTerm');
  const drivaliaConfigMileage = document.getElementById('drivaliaConfigMileage');
  const drivaliaConfigContract = document.getElementById('drivaliaConfigContract');

  // Load makes on initial load
  loadMakes('lex');
  loadMakes('drivalia');

  // Toggle browser panels
  lexBrowserHeader?.addEventListener('click', () => {
    lexBrowserHeader.classList.toggle('open');
    lexBrowserContent.classList.toggle('open');
    if (lexBrowserContent.classList.contains('open') && vehicleBrowserState.lex.vehicles.length === 0) {
      loadVehicles('lex');
    }
  });

  drivaliaBrowserHeader?.addEventListener('click', () => {
    drivaliaBrowserHeader.classList.toggle('open');
    drivaliaBrowserContent.classList.toggle('open');
    if (drivaliaBrowserContent.classList.contains('open') && vehicleBrowserState.drivalia.vehicles.length === 0) {
      loadVehicles('drivalia');
    }
  });

  // Load makes on initial load
  async function loadMakes(provider) {
    try {
      const response = await fetch(`${API_URL}/api/admin/rates/filters`);
      const data = await response.json();

      const state = vehicleBrowserState[provider];
      state.filterOptions.manufacturers = data.manufacturers || [];

      const manufacturerSelect = provider === 'lex' ? lexFilterManufacturer : drivaliaFilterManufacturer;

      // Populate manufacturer dropdown
      manufacturerSelect.innerHTML = '<option value="">All Makes</option>' +
        state.filterOptions.manufacturers.map(m => `<option value="${m}">${m}</option>`).join('');

    } catch (error) {
      console.error(`Failed to load ${provider} makes:`, error);
    }
  }

  // Load models for a specific make
  async function loadModels(provider, manufacturer) {
    const modelSelect = provider === 'lex' ? lexFilterModel : drivaliaFilterModel;
    const state = vehicleBrowserState[provider];

    if (!manufacturer) {
      modelSelect.innerHTML = '<option value="">All Models</option>';
      modelSelect.disabled = true;
      state.filterOptions.models = [];
      return;
    }

    modelSelect.innerHTML = '<option value="">Loading...</option>';
    modelSelect.disabled = true;

    try {
      // Fetch models for this manufacturer from the API
      const response = await fetch(`${API_URL}/api/vehicles/models?manufacturer=${encodeURIComponent(manufacturer)}`);
      const data = await response.json();

      state.filterOptions.models = data.models || [];

      modelSelect.innerHTML = '<option value="">All Models</option>' +
        state.filterOptions.models.map(m => `<option value="${m}">${m}</option>`).join('');
      modelSelect.disabled = false;

    } catch (error) {
      console.error(`Failed to load ${provider} models:`, error);
      modelSelect.innerHTML = '<option value="">All Models</option>';
      modelSelect.disabled = true;
    }
  }

  // Load vehicles
  async function loadVehicles(provider) {
    const state = vehicleBrowserState[provider];
    const vehicleList = provider === 'lex' ? lexVehicleList : drivaliaVehicleList;
    const pageInfo = provider === 'lex' ? lexPageInfo : drivaliaPageInfo;
    const prevBtn = provider === 'lex' ? lexPrevPage : drivaliaPrevPage;
    const nextBtn = provider === 'lex' ? lexNextPage : drivaliaNextPage;

    vehicleList.innerHTML = '<div class="vehicle-list-loading">Loading vehicles...</div>';

    try {
      let response, data;

      if (provider === 'lex') {
        // For Lex, use the vehicles endpoint that returns Lex-specific codes
        const params = new URLSearchParams({ hasLexCodes: 'true' });
        if (state.filters.manufacturer) params.set('make', state.filters.manufacturer);

        response = await fetch(`${API_URL}/api/lex-autolease/vehicles?${params}`);
        data = await response.json();

        // Filter by search and model client-side
        let vehicles = data.vehicles || [];
        if (state.filters.search) {
          const query = state.filters.search.toLowerCase();
          vehicles = vehicles.filter(v =>
            v.manufacturer?.toLowerCase().includes(query) ||
            v.model?.toLowerCase().includes(query) ||
            v.variant?.toLowerCase().includes(query)
          );
        }
        if (state.filters.model) {
          vehicles = vehicles.filter(v => v.model === state.filters.model);
        }

        // Paginate client-side
        const offset = (state.page - 1) * 20;
        state.totalPages = Math.ceil(vehicles.length / 20);
        state.vehicles = vehicles.slice(offset, offset + 20);
        state.allVehicles = vehicles; // Keep all for selection lookup

        // Extract unique makes for filter
        if (!state.filterOptions.manufacturers.length && data.makes) {
          state.filterOptions.manufacturers = data.makes;
          const manufacturerSelect = lexFilterManufacturer;
          manufacturerSelect.innerHTML = '<option value="">All Makes</option>' +
            data.makes.map(m => `<option value="${m}">${m}</option>`).join('');
        }
      } else {
        // For Drivalia, use the vehicles endpoint with CAP codes (same as admin page)
        const params = new URLSearchParams({
          requirePricing: 'false',
          hasCapCode: 'true',
          limit: '1000'
        });

        if (state.filters.manufacturer) params.set('make', state.filters.manufacturer);

        response = await fetch(`${API_URL}/api/vehicles?${params}`);
        data = await response.json();

        // Filter by model and search client-side
        let vehicles = (data.vehicles || []).filter(v => v.capCode);
        if (state.filters.model) {
          vehicles = vehicles.filter(v => v.model === state.filters.model);
        }
        if (state.filters.search) {
          const query = state.filters.search.toLowerCase();
          vehicles = vehicles.filter(v =>
            v.manufacturer?.toLowerCase().includes(query) ||
            v.model?.toLowerCase().includes(query) ||
            v.variant?.toLowerCase().includes(query)
          );
        }

        // Paginate client-side
        const offset = (state.page - 1) * 20;
        state.totalPages = Math.ceil(vehicles.length / 20);
        state.vehicles = vehicles.slice(offset, offset + 20);
        state.allVehicles = vehicles; // Keep all for selection lookup

        // Extract unique makes for filter
        if (!state.filterOptions.manufacturers.length && data.makes) {
          state.filterOptions.manufacturers = data.makes;
          const manufacturerSelect = drivaliaFilterManufacturer;
          manufacturerSelect.innerHTML = '<option value="">All Makes</option>' +
            data.makes.map(m => `<option value="${m}">${m}</option>`).join('');
        }
      }

      // Update pagination
      pageInfo.textContent = `Page ${state.page} of ${state.totalPages || 1}`;
      prevBtn.disabled = state.page <= 1;
      nextBtn.disabled = state.page >= state.totalPages;

      // Render vehicles
      if (state.vehicles.length === 0) {
        vehicleList.innerHTML = '<div class="vehicle-list-empty">No vehicles found</div>';
        return;
      }

      if (provider === 'lex') {
        // Lex vehicles from /api/lex-autolease/vehicles (camelCase from Drizzle)
        vehicleList.innerHTML = state.vehicles.map(v => {
          const isSelected = state.selected.has(v.id);
          return `
            <div class="vehicle-list-item" data-id="${v.id}">
              <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${v.id}">
              <div class="vehicle-info">
                <div class="vehicle-name">${v.manufacturer} ${v.model}</div>
                <div class="vehicle-details">${v.variant || ''} • ${v.fuelType || ''} • ${v.transmission || ''}</div>
                <div class="vehicle-cap">Lex: ${v.lexMakeCode}/${v.lexModelCode}/${v.lexVariantCode}</div>
              </div>
            </div>
          `;
        }).join('');

        // Add click handlers for Lex (using vehicle ID)
        vehicleList.querySelectorAll('.vehicle-list-item').forEach(item => {
          const checkbox = item.querySelector('input[type="checkbox"]');
          const vehicleId = item.dataset.id;

          item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
              checkbox.checked = !checkbox.checked;
            }
            if (checkbox.checked) {
              state.selected.add(vehicleId);
            } else {
              state.selected.delete(vehicleId);
            }
            updateSelectionUI(provider);
          });
        });
      } else {
        // Drivalia uses vehicles endpoint (camelCase)
        vehicleList.innerHTML = state.vehicles.map(v => {
          const isSelected = state.selected.has(v.id);
          return `
            <div class="vehicle-list-item drivalia" data-id="${v.id}">
              <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${v.id}">
              <div class="vehicle-info">
                <div class="vehicle-name">${v.manufacturer} ${v.model}</div>
                <div class="vehicle-details">${v.variant || ''} • ${v.fuelType || ''} • ${v.transmission || ''}</div>
                <div class="vehicle-cap">CAP: ${v.capCode}</div>
              </div>
            </div>
          `;
        }).join('');

        // Add click handlers for Drivalia (using vehicle ID)
        vehicleList.querySelectorAll('.vehicle-list-item').forEach(item => {
          const checkbox = item.querySelector('input[type="checkbox"]');
          const vehicleId = item.dataset.id;

          item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
              checkbox.checked = !checkbox.checked;
            }
            if (checkbox.checked) {
              state.selected.add(vehicleId);
            } else {
              state.selected.delete(vehicleId);
            }
            updateSelectionUI(provider);
          });
        });
      }

      updateSelectionUI(provider);

    } catch (error) {
      console.error(`Failed to load ${provider} vehicles:`, error);
      vehicleList.innerHTML = '<div class="vehicle-list-empty">Failed to load vehicles</div>';
    }
  }

  // Update selection UI
  function updateSelectionUI(provider) {
    const state = vehicleBrowserState[provider];
    const countEl = provider === 'lex' ? lexSelectedCount : drivaliaSelectedCount;
    const addBtn = provider === 'lex' ? lexAddToQueueBtn : drivaliaAddToQueueBtn;

    countEl.textContent = state.selected.size;
    addBtn.disabled = state.selected.size === 0;
    addBtn.textContent = state.selected.size > 0
      ? `Add ${state.selected.size} to Queue`
      : 'Add to Queue';
  }

  // Filter event handlers - Lex
  let lexSearchTimeout;
  lexFilterManufacturer?.addEventListener('change', () => {
    vehicleBrowserState.lex.filters.manufacturer = lexFilterManufacturer.value;
    vehicleBrowserState.lex.filters.model = ''; // Reset model when manufacturer changes
    vehicleBrowserState.lex.page = 1;
    loadModels('lex', lexFilterManufacturer.value);
    loadVehicles('lex');
  });

  lexFilterModel?.addEventListener('change', () => {
    vehicleBrowserState.lex.filters.model = lexFilterModel.value;
    vehicleBrowserState.lex.page = 1;
    loadVehicles('lex');
  });

  lexFilterSearch?.addEventListener('input', () => {
    clearTimeout(lexSearchTimeout);
    lexSearchTimeout = setTimeout(() => {
      vehicleBrowserState.lex.filters.search = lexFilterSearch.value;
      vehicleBrowserState.lex.page = 1;
      loadVehicles('lex');
    }, 300);
  });

  // Filter event handlers - Drivalia
  let drivaliaSearchTimeout;
  drivaliaFilterManufacturer?.addEventListener('change', () => {
    vehicleBrowserState.drivalia.filters.manufacturer = drivaliaFilterManufacturer.value;
    vehicleBrowserState.drivalia.filters.model = ''; // Reset model when manufacturer changes
    vehicleBrowserState.drivalia.page = 1;
    loadModels('drivalia', drivaliaFilterManufacturer.value);
    loadVehicles('drivalia');
  });

  drivaliaFilterModel?.addEventListener('change', () => {
    vehicleBrowserState.drivalia.filters.model = drivaliaFilterModel.value;
    vehicleBrowserState.drivalia.page = 1;
    loadVehicles('drivalia');
  });

  drivaliaFilterSearch?.addEventListener('input', () => {
    clearTimeout(drivaliaSearchTimeout);
    drivaliaSearchTimeout = setTimeout(() => {
      vehicleBrowserState.drivalia.filters.search = drivaliaFilterSearch.value;
      vehicleBrowserState.drivalia.page = 1;
      loadVehicles('drivalia');
    }, 300);
  });

  // Pagination - Lex
  lexPrevPage?.addEventListener('click', () => {
    if (vehicleBrowserState.lex.page > 1) {
      vehicleBrowserState.lex.page--;
      loadVehicles('lex');
    }
  });

  lexNextPage?.addEventListener('click', () => {
    if (vehicleBrowserState.lex.page < vehicleBrowserState.lex.totalPages) {
      vehicleBrowserState.lex.page++;
      loadVehicles('lex');
    }
  });

  // Pagination - Drivalia
  drivaliaPrevPage?.addEventListener('click', () => {
    if (vehicleBrowserState.drivalia.page > 1) {
      vehicleBrowserState.drivalia.page--;
      loadVehicles('drivalia');
    }
  });

  drivaliaNextPage?.addEventListener('click', () => {
    if (vehicleBrowserState.drivalia.page < vehicleBrowserState.drivalia.totalPages) {
      vehicleBrowserState.drivalia.page++;
      loadVehicles('drivalia');
    }
  });

  // Select All - Lex (uses vehicle ID, not capCode)
  lexSelectAll?.addEventListener('click', () => {
    const state = vehicleBrowserState.lex;
    const allSelected = state.vehicles.every(v => state.selected.has(v.id));

    if (allSelected) {
      // Deselect all on current page
      state.vehicles.forEach(v => state.selected.delete(v.id));
      lexSelectAll.textContent = 'Select All';
    } else {
      // Select all on current page
      state.vehicles.forEach(v => state.selected.add(v.id));
      lexSelectAll.textContent = 'Deselect All';
    }

    // Update checkboxes
    lexVehicleList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = state.selected.has(cb.dataset.id);
    });

    updateSelectionUI('lex');
  });

  // Select All - Drivalia (uses vehicle ID, not capCode)
  drivaliaSelectAll?.addEventListener('click', () => {
    const state = vehicleBrowserState.drivalia;
    const allSelected = state.vehicles.every(v => state.selected.has(v.id));

    if (allSelected) {
      state.vehicles.forEach(v => state.selected.delete(v.id));
      drivaliaSelectAll.textContent = 'Select All';
    } else {
      state.vehicles.forEach(v => state.selected.add(v.id));
      drivaliaSelectAll.textContent = 'Deselect All';
    }

    drivaliaVehicleList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = state.selected.has(cb.dataset.id);
    });

    updateSelectionUI('drivalia');
  });

  // Add to Queue - Lex
  lexAddToQueueBtn?.addEventListener('click', async () => {
    const state = vehicleBrowserState.lex;
    if (state.selected.size === 0) return;

    lexAddToQueueBtn.disabled = true;
    lexAddToQueueBtn.textContent = 'Adding...';

    try {
      const term = parseInt(lexConfigTerm.value);
      const mileage = parseInt(lexConfigMileage.value);
      const contractType = lexConfigContract.value;

      // Get full vehicle info for selected vehicle IDs
      // Look in both current page and allVehicles (full list)
      const allVehicles = state.allVehicles || state.vehicles;
      const selectedVehicles = allVehicles.filter(v => state.selected.has(v.id));

      // Build queue items with Lex codes (matching admin page format)
      const vehicles = selectedVehicles.map(v => ({
        vehicleId: v.id,
        capCode: v.capCode,
        manufacturer: v.manufacturer,
        model: v.model,
        variant: v.variant || '',
        lexMakeCode: v.lexMakeCode,
        lexModelCode: v.lexModelCode,
        lexVariantCode: v.lexVariantCode,
        term,
        mileage,
        contractType,
        co2: v.co2 || 0
      }));

      const response = await fetch(`${API_URL}/api/lex-autolease/quote-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles })
      });

      const data = await response.json();

      if (data.success) {
        lexStatusEl.className = 'status success';
        lexStatusEl.textContent = `Added ${vehicles.length} vehicles to queue`;
        state.selected.clear();
        updateSelectionUI('lex');
        loadVehicles('lex');
        await checkLexQueue();
      } else {
        throw new Error(data.error || 'Failed to add to queue');
      }
    } catch (error) {
      console.error('Failed to add to Lex queue:', error);
      lexStatusEl.className = 'status error';
      lexStatusEl.textContent = `Failed: ${error.message}`;
    }

    lexAddToQueueBtn.disabled = false;
    updateSelectionUI('lex');
  });

  // Add to Queue - Drivalia
  drivaliaAddToQueueBtn?.addEventListener('click', async () => {
    const state = vehicleBrowserState.drivalia;
    if (state.selected.size === 0) return;

    drivaliaAddToQueueBtn.disabled = true;
    drivaliaAddToQueueBtn.textContent = 'Adding...';

    try {
      const term = parseInt(drivaliaConfigTerm.value);
      const mileage = parseInt(drivaliaConfigMileage.value);
      const contractType = drivaliaConfigContract.value;

      // Get full vehicle info for selected vehicle IDs
      const allVehicles = state.allVehicles || state.vehicles;
      const selectedVehicles = allVehicles.filter(v => state.selected.has(v.id));

      // Build queue items with CAP codes
      const items = selectedVehicles.map(v => ({
        vehicleId: v.id,
        capCode: v.capCode,
        manufacturer: v.manufacturer,
        model: v.model,
        variant: v.variant || '',
        term,
        mileage,
        contractType
      }));

      const response = await fetch(`${API_URL}/api/drivalia/quote-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const data = await response.json();

      if (data.success) {
        drivaliaStatusEl.className = 'status success';
        drivaliaStatusEl.textContent = `Added ${items.length} vehicles to queue`;
        state.selected.clear();
        updateSelectionUI('drivalia');
        loadVehicles('drivalia');
        await checkDrivaliaQueue();
      } else {
        throw new Error(data.error || 'Failed to add to queue');
      }
    } catch (error) {
      console.error('Failed to add to Drivalia queue:', error);
      drivaliaStatusEl.className = 'status error';
      drivaliaStatusEl.textContent = `Failed: ${error.message}`;
    }

    drivaliaAddToQueueBtn.disabled = false;
    updateSelectionUI('drivalia');
  });

  // Clear Queue - Lex
  lexClearQueueBtn?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear the entire Lex queue?')) return;

    lexClearQueueBtn.disabled = true;
    lexClearQueueBtn.textContent = 'Clearing...';

    try {
      const response = await fetch(`${API_URL}/api/lex-autolease/quote-queue`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        lexStatusEl.className = 'status success';
        lexStatusEl.textContent = 'Queue cleared';
        await checkLexQueue();
      } else {
        throw new Error(data.error || 'Failed to clear queue');
      }
    } catch (error) {
      console.error('Failed to clear Lex queue:', error);
      lexStatusEl.className = 'status error';
      lexStatusEl.textContent = `Failed: ${error.message}`;
    }

    lexClearQueueBtn.disabled = false;
    lexClearQueueBtn.textContent = 'Clear';
  });

  // Clear Queue - Drivalia
  drivaliaClearQueueBtn?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear the entire Drivalia queue?')) return;

    drivaliaClearQueueBtn.disabled = true;
    drivaliaClearQueueBtn.textContent = 'Clearing...';

    try {
      const response = await fetch(`${API_URL}/api/drivalia/quote-queue`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        drivaliaStatusEl.className = 'status success';
        drivaliaStatusEl.textContent = 'Queue cleared';
        await checkDrivaliaQueue();
      } else {
        throw new Error(data.error || 'Failed to clear queue');
      }
    } catch (error) {
      console.error('Failed to clear Drivalia queue:', error);
      drivaliaStatusEl.className = 'status error';
      drivaliaStatusEl.textContent = `Failed: ${error.message}`;
    }

    drivaliaClearQueueBtn.disabled = false;
    drivaliaClearQueueBtn.textContent = 'Clear';
  });
});
