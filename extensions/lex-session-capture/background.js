// Background service worker
// Orchestrates quote automation via content scripts for multiple providers

const API_URL = 'https://splitlease.netlify.app';
const LEX_URL = 'https://associate.lexautolease.co.uk';
const DRIVALIA_URL = 'https://www.caafgenus3.co.uk';

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Store session data (for reference, not needed for DOM automation)
let sessionData = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Lex-specific actions
  if (message.action === 'captureSession') {
    handleCapture(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'runQuote') {
    runQuoteViaContentScript(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'testLoadVehicle') {
    testLoadVehicle(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'getSessionData') {
    sendResponse(sessionData);
    return true;
  }

  if (message.action === 'processQueue') {
    processQuoteQueue()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // Drivalia-specific actions
  if (message.action === 'runDrivaliaQuote') {
    runDrivaliaQuote(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'processDrivaliaQueue') {
    processDrivaliaQueue()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // Provider detection
  if (message.action === 'detectProvider') {
    detectActiveProvider()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'openProviderTab') {
    openProviderTab(message.provider)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

// Detect which provider tab is currently active/available
async function detectActiveProvider() {
  const lexTab = await findLexQuoteTab();
  const drivaliaTab = await findDrivaliaQuoteTab();

  return {
    lex: !!lexTab,
    drivalia: !!drivaliaTab,
    lexTabId: lexTab?.id,
    drivaliaTabId: drivaliaTab?.id
  };
}

// Open a new tab for a specific provider
async function openProviderTab(provider) {
  let url;
  if (provider === 'lex') {
    url = `${LEX_URL}/QuickQuote.aspx`;
  } else if (provider === 'drivalia') {
    url = `${DRIVALIA_URL}/WebApp/fmoportal/index.html#/quoting/new`;
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const tab = await chrome.tabs.create({ url });
  return { tabId: tab.id };
}

async function handleCapture({ csrfToken, cookies, profile }) {
  // Store locally
  sessionData = { csrfToken, cookies, profile };

  // Also send to server for reference
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

// ==================== LEX FUNCTIONS ====================

// Find the Lex tab with quote form
async function findLexQuoteTab() {
  const tabs = await chrome.tabs.query({ url: `${LEX_URL}/*` });

  for (const tab of tabs) {
    try {
      // Check if this tab has the quote form
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkPageReady' });
      if (response?.ready) {
        return tab;
      }
    } catch (e) {
      // Content script not loaded or error - skip this tab
      console.log(`Tab ${tab.id} not ready:`, e.message);
    }
  }

  return null;
}

// Test loading just make/model/variant
async function testLoadVehicle(data) {
  const lexTab = await findLexQuoteTab();

  if (!lexTab) {
    throw new Error('No Lex quote page found. Please navigate to QuickQuote.aspx');
  }

  console.log(`[Background] Testing vehicle load via tab ${lexTab.id}`);

  const result = await chrome.tabs.sendMessage(lexTab.id, {
    action: 'testLoadVehicle',
    data
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

// Run a quote via the content script (DOM automation)
async function runQuoteViaContentScript(quoteData) {
  // Find a Lex tab with the quote form ready
  const lexTab = await findLexQuoteTab();

  if (!lexTab) {
    throw new Error('No Lex quote page found. Please navigate to the Quote page on associate.lexautolease.co.uk');
  }

  console.log(`[Background] Running quote via tab ${lexTab.id}`);

  // Send message to content script to run the quote
  const result = await chrome.tabs.sendMessage(lexTab.id, {
    action: 'runQuoteInPage',
    data: quoteData
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

// Process the Lex quote queue
async function processQuoteQueue() {
  // Find a Lex tab first
  const lexTab = await findLexQuoteTab();

  if (!lexTab) {
    throw new Error('No Lex quote page found. Please navigate to the Quote page on associate.lexautolease.co.uk');
  }

  // Fetch queue from server (with cache-busting)
  const queueResponse = await fetch(`${API_URL}/api/lex-autolease/quote-queue?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  const queueData = await queueResponse.json();

  if (!queueData.queue || queueData.queue.length === 0) {
    throw new Error('No quotes in queue');
  }

  const pendingItems = queueData.queue.filter(q => q.status === 'pending');

  if (pendingItems.length === 0) {
    throw new Error('No pending quotes to process');
  }

  let processed = 0;
  let errors = 0;

  for (const item of pendingItems) {
    try {
      // Update status to running
      await updateQueueItem(item.vehicleId, 'running');

      // Run the quote via content script
      const result = await chrome.tabs.sendMessage(lexTab.id, {
        action: 'runQuoteInPage',
        data: {
          makeId: item.lexMakeCode,
          modelId: item.lexModelCode,
          variantId: item.lexVariantCode,
          term: item.term,
          mileage: item.mileage,
          paymentPlan: item.paymentPlan || 'spread_3_down',
          contractType: item.contractType,
          co2: item.co2,
          customOtrp: item.customOtrp // Fleet Marque pricing if rerunning
        }
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Update status to complete with result (including brokerOtrp for FM comparison)
      await updateQueueItem(item.vehicleId, 'complete', {
        quoteId: result.quoteId,
        monthlyRental: result.monthlyRental,
        initialRental: result.initialRental,
        otrp: result.otrp,
        brokerOtrp: result.brokerOtrp
      });

      processed++;

      // Navigate back to new quote for next vehicle
      // The content script could handle this, or we reload
      await navigateToNewQuote(lexTab.id);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Quote failed for ${item.manufacturer} ${item.model}:`, errorMessage);

      // Update status to error
      await updateQueueItem(item.vehicleId, 'error', null, errorMessage);
      errors++;

      // Try to navigate back for next quote
      try {
        await navigateToNewQuote(lexTab.id);
      } catch (e) {
        console.error('Failed to navigate to new quote:', e);
      }
    }
  }

  return {
    success: true,
    processed,
    errors
  };
}

// Navigate the Lex tab to a new quote page and wait for content script to be ready
async function navigateToNewQuote(tabId) {
  console.log('[Background] Navigating to new Lex quote page...');

  await chrome.tabs.update(tabId, {
    url: `${LEX_URL}/QuickQuote.aspx`
  });

  // Wait for tab to finish loading
  await new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    // Timeout after 30 seconds
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 30000);
  });

  console.log('[Background] Page loaded, waiting for content script...');

  // Wait a bit for content script to initialize
  await sleep(2000);

  // Poll until content script responds
  let ready = false;
  let attempts = 0;
  while (!ready && attempts < 20) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'checkPageReady' });
      if (response?.ready) {
        ready = true;
        console.log('[Background] Content script ready!');
      }
    } catch (e) {
      console.log('[Background] Content script not ready yet, retrying...', attempts);
    }
    if (!ready) {
      await sleep(500);
      attempts++;
    }
  }

  if (!ready) {
    throw new Error('Content script failed to load after navigation');
  }
}

// Update Lex queue item status on server
async function updateQueueItem(vehicleId, status, result = null, error = null) {
  const body = { vehicleId, status };
  if (result) body.result = result;
  if (error) body.error = error;

  await fetch(`${API_URL}/api/lex-autolease/quote-queue`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// ==================== DRIVALIA FUNCTIONS ====================

// Find the Drivalia tab with quote form
async function findDrivaliaQuoteTab() {
  const tabs = await chrome.tabs.query({ url: `${DRIVALIA_URL}/*` });

  for (const tab of tabs) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkDrivaliaPageReady' });
      if (response?.ready) {
        return tab;
      }
    } catch (e) {
      console.log(`Drivalia tab ${tab.id} not ready:`, e.message);
    }
  }

  return null;
}

// Run a single Drivalia quote
async function runDrivaliaQuote(quoteData) {
  const drivaliaTab = await findDrivaliaQuoteTab();

  if (!drivaliaTab) {
    throw new Error('No Drivalia quote page found. Please navigate to the Drivalia portal.');
  }

  console.log(`[Background] Running Drivalia quote via tab ${drivaliaTab.id}`);

  const result = await chrome.tabs.sendMessage(drivaliaTab.id, {
    action: 'runDrivaliaQuote',
    data: quoteData
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

// Process the Drivalia quote queue
async function processDrivaliaQueue() {
  const drivaliaTab = await findDrivaliaQuoteTab();

  if (!drivaliaTab) {
    throw new Error('No Drivalia quote page found. Please navigate to the Drivalia portal.');
  }

  // Fetch Drivalia queue from server
  const queueResponse = await fetch(`${API_URL}/api/drivalia/quote-queue?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  const queueData = await queueResponse.json();

  if (!queueData.queue || queueData.queue.length === 0) {
    throw new Error('No Drivalia quotes in queue');
  }

  const pendingItems = queueData.queue.filter(q => q.status === 'pending');

  if (pendingItems.length === 0) {
    throw new Error('No pending Drivalia quotes to process');
  }

  let processed = 0;
  let errors = 0;

  for (const item of pendingItems) {
    try {
      // Update status to running
      await updateDrivaliaQueueItem(item.vehicleId, 'running');

      // Run the quote via content script
      const result = await chrome.tabs.sendMessage(drivaliaTab.id, {
        action: 'runDrivaliaQuote',
        data: {
          capCode: item.capCode,
          term: item.term,
          mileage: item.mileage,
          contractType: item.contractType,
          companyName: item.companyName || 'Quote Test Ltd'
        }
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Update status to complete with result
      await updateDrivaliaQueueItem(item.vehicleId, 'complete', {
        quoteId: result.quoteId,
        monthlyRental: result.monthlyRental,
        monthlyRentalIncVat: result.monthlyRentalIncVat,
        initialRental: result.initialRental,
        p11d: result.p11d
      });

      processed++;

      // Navigate to new quote for next vehicle
      await navigateToDrivaliaNewQuote(drivaliaTab.id);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Drivalia quote failed for ${item.capCode}:`, errorMessage);

      await updateDrivaliaQueueItem(item.vehicleId, 'error', null, errorMessage);
      errors++;

      try {
        await navigateToDrivaliaNewQuote(drivaliaTab.id);
      } catch (e) {
        console.error('Failed to navigate to new Drivalia quote:', e);
      }
    }
  }

  return {
    success: true,
    processed,
    errors
  };
}

// Navigate Drivalia tab to new quote page
async function navigateToDrivaliaNewQuote(tabId) {
  console.log('[Background] Navigating to new Drivalia quote page...');

  await chrome.tabs.update(tabId, {
    url: `${DRIVALIA_URL}/WebApp/fmoportal/index.html#/quoting/new`
  });

  // Wait for tab to finish loading
  await new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 30000);
  });

  await sleep(3000); // Angular apps need more time

  // Poll until content script responds
  let ready = false;
  let attempts = 0;
  while (!ready && attempts < 20) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'checkDrivaliaPageReady' });
      if (response?.ready) {
        ready = true;
        console.log('[Background] Drivalia content script ready!');
      }
    } catch (e) {
      console.log('[Background] Drivalia content script not ready yet, retrying...', attempts);
    }
    if (!ready) {
      await sleep(500);
      attempts++;
    }
  }

  if (!ready) {
    throw new Error('Drivalia content script failed to load after navigation');
  }
}

// Update Drivalia queue item status on server
async function updateDrivaliaQueueItem(vehicleId, status, result = null, error = null) {
  const body = { vehicleId, status };
  if (result) body.result = result;
  if (error) body.error = error;

  await fetch(`${API_URL}/api/drivalia/quote-queue`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// ==================== UTILITIES ====================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
