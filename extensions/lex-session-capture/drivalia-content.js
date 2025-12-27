// Drivalia Content Script - runs in the context of the Drivalia/CAAF portal
// Uses DOM automation with Angular Material selectors
// Intercepts API responses for accurate data extraction

console.log('[Drivalia] Content script loaded');

// Store for intercepted API responses
let lastQuoteResponse = null;

// Listen for messages from the MAIN world interceptor script
// (drivalia-interceptor.js is now loaded directly via manifest with world: "MAIN")
window.addEventListener('message', (event) => {
  if (event.data?.type === 'DRIVALIA_QUOTE_RESPONSE') {
    lastQuoteResponse = event.data.data;
    // Store the URL so we can extract quote ID from /quote/{id} pattern
    if (lastQuoteResponse) {
      lastQuoteResponse._capturedUrl = event.data.url;
    }
    console.log('[Drivalia] Stored quote response from interceptor, url:', event.data.url);
    console.log('[Drivalia] Response has keys:', Object.keys(lastQuoteResponse || {}));
    if (lastQuoteResponse?.summary?.assetLines?.[0]) {
      const assetLine = lastQuoteResponse.summary.assetLines[0];
      console.log('[Drivalia] Found assetLine - P11D:', assetLine.p11d, 'schedule length:', assetLine.schedule?.length);
    }
  }
});

// Helper to send commands to MAIN world script for Angular interactions
function angularCommand(command, selector, value) {
  console.log('[Drivalia] Sending Angular command:', command, selector);
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data?.type === 'DRIVALIA_ANGULAR_RESULT') {
        console.log('[Drivalia] Received Angular result:', event.data);
        window.removeEventListener('message', handler);
        resolve(event.data);
      }
    };
    window.addEventListener('message', handler);

    window.postMessage({
      type: 'DRIVALIA_ANGULAR_COMMAND',
      command,
      selector,
      value
    }, '*');

    // Timeout after 3 seconds
    setTimeout(() => {
      console.log('[Drivalia] Angular command timed out for:', command, selector);
      window.removeEventListener('message', handler);
      resolve({ success: false, error: 'timeout' });
    }, 3000);
  });
}

// Product codes for different contract types
// Updated from Playwright recording - exact product names in the modal
const PRODUCT_PATTERNS = {
  'BCH': 'DRIVALIA - ALL BRANDS DISCOUNT BROKER BCH',    // Business Contract Hire
  'BCHNM': 'DRIVALIA - ALL BRANDS DISCOUNT BROKER BCH',  // BCH No Maintenance
  'PCH': 'DRIVALIA - ALL BRANDS DISCOUNT BROKER PCH',    // Personal Contract Hire
  'CH': 'DRIVALIA - ALL BRANDS DISCOUNT BROKER BCH'      // Contract Hire
};

// Helper functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found after ${timeout}ms`));
    }, timeout);
  });
}

function waitForElementByText(text, tagName = '*', timeout = 10000) {
  return new Promise((resolve, reject) => {
    const checkElement = () => {
      const elements = document.querySelectorAll(tagName);
      for (const el of elements) {
        if (el.textContent?.includes(text)) {
          return el;
        }
      }
      return null;
    };

    const el = checkElement();
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = checkElement();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element with text "${text}" not found after ${timeout}ms`));
    }, timeout);
  });
}

// Find element by aria-label (Playwright getByLabel equivalent)
function findByLabel(label, tagName = '*') {
  const elements = document.querySelectorAll(tagName);
  for (const el of elements) {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel?.includes(label)) return el;

    // Also check associated label elements
    const id = el.id;
    if (id) {
      const labelEl = document.querySelector(`label[for="${id}"]`);
      if (labelEl?.textContent?.includes(label)) return el;
    }
  }
  return null;
}

// Find element by role and name (Playwright getByRole equivalent)
function findByRole(role, name, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const checkElement = () => {
      let selector;
      switch (role) {
        case 'link':
          selector = 'a, [role="link"]';
          break;
        case 'button':
          selector = 'button, [role="button"]';
          break;
        case 'textbox':
          selector = 'input[type="text"], input:not([type]), textarea, [role="textbox"]';
          break;
        case 'spinbutton':
          selector = 'input[type="number"], [role="spinbutton"]';
          break;
        default:
          selector = `[role="${role}"]`;
      }

      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const ariaLabel = el.getAttribute('aria-label') || '';
        const textContent = el.textContent?.trim() || '';
        const placeholder = el.getAttribute('placeholder') || '';

        if (ariaLabel.includes(name) || textContent.includes(name) || placeholder.includes(name)) {
          return el;
        }
      }
      return null;
    };

    const el = checkElement();
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = checkElement();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element with role="${role}" and name="${name}" not found after ${timeout}ms`));
    }, timeout);
  });
}

function triggerAngularInput(element, value) {
  // Clear existing value
  element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));

  // Set new value
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function clickElement(element) {
  element.scrollIntoView({ behavior: 'instant', block: 'center' });
  element.click();
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Drivalia] Received message:', message.action);

  if (message.action === 'runDrivaliaQuote') {
    runQuote(message.data)
      .then(sendResponse)
      .catch(err => {
        console.error('[Drivalia] Quote failed:', err);
        sendResponse({ error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.action === 'checkDrivaliaPageReady') {
    // Check if we're on the quote page
    const isQuotePage = window.location.hash.includes('/quoting/new');
    sendResponse({
      ready: isQuotePage,
      url: window.location.href,
      provider: 'drivalia'
    });
    return true;
  }

  if (message.action === 'getDrivaliaLastResponse') {
    sendResponse({ data: lastQuoteResponse });
    return true;
  }
});

async function runQuote({ capCode, term, mileage, contractType, companyName = 'Quote Test Ltd', upfrontPayments = 3 }) {
  console.log('[Drivalia] Starting quote automation:', { capCode, term, mileage, contractType, upfrontPayments });

  // Clear any stale response data from previous quotes
  lastQuoteResponse = null;
  console.log('[Drivalia] Cleared previous response data');

  try {
    // Ensure we're on the new quote page
    if (!window.location.hash.includes('/quoting/new')) {
      console.log('[Drivalia] Navigating to new quote page...');
      window.location.hash = '/quoting/new';
      await sleep(2000);
    }

    // Step 0: Wait for page to fully load and dismiss any existing modals
    console.log('[Drivalia] Waiting for page to load...');
    await sleep(1500);

    // Dismiss any existing DPA modal from previous sessions
    const existingDpaBtn = document.querySelector('button[data-hook="dpaaccept"]');
    if (existingDpaBtn) {
      console.log('[Drivalia] Dismissing existing DPA Agreement modal');
      clickElement(existingDpaBtn);
      await sleep(1000);
    }

    // Step 1: Set Customer Type using MAIN world Angular helper
    // The select element has data-hook="quoting.customer.customertype" and uses AngularJS
    console.log('[Drivalia] Setting customer type via MAIN world...');

    // Determine customer type based on contract type
    // PCH = Personal, BCH/CH = Company
    const customerTypeValue = contractType === 'PCH' ? 'string:I' : 'string:C';

    // Use the MAIN world script to set the Angular select value
    const selectResult = await angularCommand(
      'setSelectValue',
      'select[data-hook="quoting.customer.customertype"]',
      customerTypeValue
    );
    console.log('[Drivalia] Customer type result:', selectResult);
    await sleep(1000); // Wait for Angular to update the form

    // Step 2: Click "Customer" link to expand section (from Playwright: getByRole('link', { name: 'Customer' }))
    console.log('[Drivalia] Expanding Customer section...');
    const customerLink = await findByRole('link', 'Customer');
    clickElement(customerLink);
    await sleep(1000);

    // Step 3: Enter company name via MAIN world (from Playwright: getByRole('textbox', { name: 'Company Name*' }))
    console.log('[Drivalia] Entering company name...');

    // Try multiple selectors for company name input via MAIN world
    const companySelectors = [
      'input[aria-label*="Company Name"]',
      'input[data-hook*="company"]',
      'input[data-hook*="companyName"]',
      'input[ng-model*="companyName"]',
      'input[ng-model*="company"]',
      'input[placeholder*="Company"]'
    ];

    let companyFound = false;
    for (const selector of companySelectors) {
      const result = await angularCommand('setInputValue', selector, companyName);
      if (result.success) {
        console.log('[Drivalia] Company name set via:', selector);
        companyFound = true;
        break;
      }
    }

    if (!companyFound) {
      // Try finding by visible label text
      const labels = document.querySelectorAll('label, .cui-form-field__label');
      for (const label of labels) {
        if (label.textContent?.includes('Company Name')) {
          const input = label.closest('.cui-form-field')?.querySelector('input') ||
                       label.parentElement?.querySelector('input');
          if (input) {
            triggerAngularInput(input, companyName);
            console.log('[Drivalia] Company name set via label proximity');
            companyFound = true;
            break;
          }
        }
      }
    }

    if (!companyFound) {
      console.warn('[Drivalia] Company name input not found, continuing anyway');
    }

    await sleep(500);

    // Collapse Customer section by clicking link again
    clickElement(customerLink);
    await sleep(300);

    // Step 4: Click "Choose a Vehicle" button (from Playwright: getByRole('button', { name: 'Choose a Vehicle' }))
    console.log('[Drivalia] Opening vehicle search...');
    const chooseVehicleBtn = await findByRole('button', 'Choose a Vehicle');
    clickElement(chooseVehicleBtn);
    await sleep(1500);

    // Step 5: Search for vehicle by CAP code (from Playwright: getByRole('textbox', { name: 'Search a Vehicle' }))
    console.log('[Drivalia] Searching for CAP code:', capCode);

    // Try multiple selectors for vehicle search input (in the modal, not global banner search)
    const searchSelectors = [
      'input[data-hook="asset.search.criteria.search.input"]',  // Correct vehicle search input
      'input[data-hook*="asset.search"]',
      '.search__query',
      'mat-dialog-container input[data-hook*="search"]',
      'mat-dialog-container .search__query',
      'pos-vehicle-search input',
      'input[aria-label*="Search a Vehicle"]'
    ];

    let vehicleSearchInput = null;
    for (const selector of searchSelectors) {
      vehicleSearchInput = document.querySelector(selector);
      if (vehicleSearchInput) {
        console.log('[Drivalia] Found search input with:', selector);
        break;
      }
    }

    // Fallback to findByRole
    if (!vehicleSearchInput) {
      vehicleSearchInput = await findByRole('textbox', 'Search', 5000).catch(() => null);
    }

    if (!vehicleSearchInput) {
      throw new Error('Vehicle search input not found');
    }

    triggerAngularInput(vehicleSearchInput, capCode);
    await sleep(3000); // Wait for search results to load

    // Step 6: Click on the first search result (from Playwright: .mat-list-item-content)
    console.log('[Drivalia] Selecting vehicle from results...');

    // Try multiple selectors for search results
    const resultSelectors = [
      '.mat-list-item-content',
      'mat-list-item',
      'mat-nav-list mat-list-item',
      '.mat-list-item',
      '[data-hook*="search-results"] mat-list-item',
      '[data-hook*="search"] .mat-list-item',
      'mat-nav-list .mat-list-item-content'
    ];

    let searchResult = null;
    for (const selector of resultSelectors) {
      searchResult = document.querySelector(selector);
      if (searchResult) {
        console.log('[Drivalia] Found search result with:', selector);
        break;
      }
    }

    if (!searchResult) {
      // Wait a bit more and try again
      await sleep(2000);
      for (const selector of resultSelectors) {
        searchResult = document.querySelector(selector);
        if (searchResult) {
          console.log('[Drivalia] Found search result (retry) with:', selector);
          break;
        }
      }
    }

    if (!searchResult) {
      throw new Error('No vehicle search results found - check if CAP code is valid');
    }
    clickElement(searchResult);
    await sleep(500);

    // Step 7: Click "Use this vehicle" button (from Playwright: getByRole('button', { name: 'Use this vehicle' }))
    console.log('[Drivalia] Confirming vehicle selection...');
    const useVehicleBtn = await findByRole('button', 'Use this vehicle');
    clickElement(useVehicleBtn);
    await sleep(1500);

    // Step 8: Wait for products to load (spinner disappears and button enabled)
    console.log('[Drivalia] Waiting for products to load...');

    // Wait for spinner to disappear (max 15 seconds)
    let spinnerWait = 0;
    while (spinnerWait < 15000) {
      const spinner = document.querySelector('cui-spinner[trigger="loadingProducts"] .is-spinning, .cui-spinner.is-spinning');
      if (!spinner) {
        console.log('[Drivalia] Spinner gone after', spinnerWait, 'ms');
        break;
      }
      await sleep(500);
      spinnerWait += 500;
    }

    // Wait for "Select a Product" button to be enabled (max 10 seconds)
    let buttonWait = 0;
    let selectProductBtn = null;
    while (buttonWait < 10000) {
      selectProductBtn = document.querySelector('button[data-hook="quoting.finance.product-select"]:not([disabled])');
      if (selectProductBtn && !selectProductBtn.disabled) {
        console.log('[Drivalia] Select Product button enabled after', buttonWait, 'ms');
        break;
      }
      await sleep(500);
      buttonWait += 500;
    }

    if (!selectProductBtn || selectProductBtn.disabled) {
      // Fallback to findByRole
      selectProductBtn = await findByRole('button', 'Select a Product');
    }

    console.log('[Drivalia] Opening product selection...');
    clickElement(selectProductBtn);
    await sleep(1000);

    // Step 9: Select the appropriate product based on contract type
    // From Playwright: getByText('DRIVALIA - ALL BRANDS DISCOUNT BROKER BCH Q4')
    console.log('[Drivalia] Selecting product for contract type:', contractType);
    const productPattern = PRODUCT_PATTERNS[contractType] || 'DRIVALIA - ALL BRANDS DISCOUNT BROKER BCH';
    const productOption = await waitForElementByText(productPattern, 'mat-list-option, .mat-list-option, p');
    clickElement(productOption);
    await sleep(500);

    // Step 10: Click "Use this Product" button (from Playwright: getByRole('button', { name: 'Use this Product' }))
    const useProductBtn = await findByRole('button', 'Use this Product');
    clickElement(useProductBtn);
    await sleep(1500);

    // Step 11: Wait for Finance config section to load
    console.log('[Drivalia] Waiting for Finance config to load...');
    let financeConfigWait = 0;
    while (financeConfigWait < 10000) {
      const financeConfig = document.querySelector('[data-hook="quoting.finance.config.finance.dropdown"]');
      if (financeConfig) {
        console.log('[Drivalia] Finance config loaded after', financeConfigWait, 'ms');
        break;
      }
      await sleep(500);
      financeConfigWait += 500;
    }
    await sleep(500); // Extra time for Angular to finish rendering

    // Step 12: Click "Finance" link to expand finance section (from Playwright: getByRole('link', { name: 'Finance' }))
    console.log('[Drivalia] Expanding Finance section...');
    const financeLink = await findByRole('link', 'Finance');
    clickElement(financeLink);
    await sleep(800);

    // Step 13: Set "No. in Advance (financier)" using data-hook selector
    console.log('[Drivalia] Setting upfront payments:', upfrontPayments);
    const advanceInput = document.querySelector('input[data-hook="quoting.finance.config.noinadvancefinancier"]') ||
                         await findByRole('spinbutton', 'No. in Advance').catch(() => null);
    if (advanceInput) {
      triggerAngularInput(advanceInput, upfrontPayments.toString());
      await sleep(300);
    } else {
      console.warn('[Drivalia] No. in Advance input not found');
    }

    // Step 14: Enter term (from Playwright: getByRole('spinbutton', { name: 'Term' }))
    console.log('[Drivalia] Entering term:', term);
    const termInput = document.querySelector('input[data-hook*="term"]') ||
                      await findByRole('spinbutton', 'Term').catch(() => null);
    if (termInput) {
      triggerAngularInput(termInput, term.toString());
      await sleep(300);
    } else {
      console.warn('[Drivalia] Term input not found');
    }

    // Step 15: Enter annual mileage in thousands (from Playwright: getByRole('textbox', { name: 'Annual Mileage (x1000)' }))
    console.log('[Drivalia] Entering mileage:', mileage);
    const mileageInThousands = Math.round(mileage / 1000);
    const mileageInput = document.querySelector('input[data-hook*="mileage"]') ||
                         document.querySelector('input[data-hook*="annualmileage"]') ||
                         await findByRole('textbox', 'Annual Mileage').catch(() => null);
    if (mileageInput) {
      triggerAngularInput(mileageInput, mileageInThousands.toString());
      await sleep(300);
    } else {
      console.warn('[Drivalia] Mileage input not found');
    }

    // Step 16: Click Recalculate (from Playwright: getByRole('button', { name: 'Recalculate' }))
    console.log('[Drivalia] Clicking Recalculate...');
    lastQuoteResponse = null; // Clear BEFORE recalculate so we capture fresh response
    const recalculateBtn = await findByRole('button', 'Recalculate');
    clickElement(recalculateBtn);

    // Wait for "Recalculating" to disappear (max 30 seconds)
    console.log('[Drivalia] Waiting for calculation to complete...');
    await sleep(1000); // Initial wait for recalculating to start
    let recalcWait = 0;
    while (recalcWait < 30000) {
      const recalculating = document.querySelector('when-waiting');
      if (!recalculating || !recalculating.textContent?.includes('Recalculating')) {
        console.log('[Drivalia] Calculation UI completed after', recalcWait, 'ms');
        break;
      }
      await sleep(500);
      recalcWait += 500;
    }

    // Wait for the response to be captured (up to 10 seconds after UI completes)
    console.log('[Drivalia] Waiting for calculate response to be captured...');
    let responseWait = 0;
    while (!lastQuoteResponse && responseWait < 10000) {
      await sleep(200);
      responseWait += 200;
    }

    // Check if we got pricing from the /calculate/ endpoint
    console.log('[Drivalia] Response capture result - set:', !!lastQuoteResponse, 'waited:', responseWait, 'ms');
    if (lastQuoteResponse) {
      const schedule = lastQuoteResponse?.summary?.assetLines?.[0]?.schedule;
      const p11d = lastQuoteResponse?.summary?.assetLines?.[0]?.p11d;
      console.log('[Drivalia] Captured pricing - P11D:', p11d, 'schedule entries:', schedule?.length);
      if (schedule?.[1]) {
        console.log('[Drivalia] Monthly rental (net):', schedule[1].netValue);
      }
    } else {
      console.error('[Drivalia] ERROR: No response captured from /calculate/ endpoint!');
      console.log('[Drivalia] Check console for [Drivalia MAIN] messages to verify interceptor is working');
    }

    // Step 17: Click Save Quote (from Playwright: getByRole('button', { name: ' Save Quote' }) - note space)
    console.log('[Drivalia] Saving quote...');
    // Store pricing from Recalculate before Save overwrites it
    const pricingData = lastQuoteResponse ? {
      summary: lastQuoteResponse.summary,
      assets: lastQuoteResponse.assets, // Needed for OTR price (assets[0].summary.supplierTotal.gross)
      p11d: lastQuoteResponse.summary?.assetLines?.[0]?.p11d
    } : null;
    console.log('[Drivalia] Stored pricing data before save:', !!pricingData);

    lastQuoteResponse = null; // Clear to capture the save response for quote ID
    const saveQuoteBtn = await waitForElementByText('Save Quote', 'button');
    clickElement(saveQuoteBtn);

    // Wait for URL to change to /quoting/{id} or for /quote/{id} response (up to 30 seconds)
    console.log('[Drivalia] Waiting for save to complete...');
    let quoteIdFromUrl = null;
    let quoteIdFromResponse = null;
    let saveWait = 0;

    while (saveWait < 30000) {
      // Check URL for quote ID
      const currentHash = window.location.hash;
      const urlMatch = currentHash.match(/\/quoting\/(\d+)/);
      if (urlMatch) {
        quoteIdFromUrl = urlMatch[1];
        console.log('[Drivalia] Quote ID found in URL:', quoteIdFromUrl);
        break;
      }

      // Check if we got a /quote/{id} response
      if (lastQuoteResponse && lastQuoteResponse._capturedUrl) {
        const responseUrlMatch = lastQuoteResponse._capturedUrl.match(/\/quote\/(\d+)/);
        if (responseUrlMatch) {
          quoteIdFromResponse = responseUrlMatch[1];
          console.log('[Drivalia] Quote ID found in response URL:', quoteIdFromResponse);
          break;
        }
      }

      await sleep(500);
      saveWait += 500;
    }
    console.log('[Drivalia] Save wait completed after', saveWait, 'ms - URL ID:', quoteIdFromUrl, 'Response ID:', quoteIdFromResponse);

    // Merge pricing data with any captured response
    if (pricingData && lastQuoteResponse) {
      lastQuoteResponse._pricingData = pricingData;
    }

    // Use whichever quote ID we found
    const capturedQuoteId = quoteIdFromUrl || quoteIdFromResponse;

    // Step 18: Handle DPA Agreement modal if it appears (wait up to 5 seconds)
    console.log('[Drivalia] Checking for DPA Agreement modal...');
    let dpaWait = 0;
    while (dpaWait < 5000) {
      const dpaAcceptBtn = document.querySelector('button[data-hook="dpaaccept"]');
      if (dpaAcceptBtn) {
        console.log('[Drivalia] DPA Agreement modal found - clicking Accept');
        clickElement(dpaAcceptBtn);
        await sleep(1500);
        break;
      }
      await sleep(300);
      dpaWait += 300;
    }

    // Step 20: Extract results using stored pricing data
    const result = await extractQuoteResult(pricingData);

    // Use the quote ID we captured during save wait
    if (capturedQuoteId && !result.quoteId) {
      result.quoteId = capturedQuoteId;
      console.log('[Drivalia] Using captured quote ID:', capturedQuoteId);
    }
    console.log('[Drivalia] Quote completed:', result);

    return {
      success: true,
      ...result,
      capCode,
      term,
      mileage,
      contractType
    };

  } catch (error) {
    console.error('[Drivalia] Quote automation failed:', error);
    throw error;
  }
}

async function extractQuoteResult(storedPricingData = null) {
  console.log('[Drivalia] Extracting quote result, storedPricingData:', !!storedPricingData);

  try {
    // Get pricing from stored data (passed from before save)
    let summary, p11d;
    if (storedPricingData?.summary) {
      summary = storedPricingData.summary;
      p11d = storedPricingData.p11d;
      console.log('[Drivalia] Using stored pricing data');
    } else if (lastQuoteResponse?._pricingData?.summary) {
      summary = lastQuoteResponse._pricingData.summary;
      p11d = lastQuoteResponse._pricingData.p11d;
      console.log('[Drivalia] Using _pricingData from response');
    } else if (lastQuoteResponse?.summary) {
      summary = lastQuoteResponse.summary;
      console.log('[Drivalia] Using summary from lastQuoteResponse');
    } else {
      console.error('[Drivalia] No pricing data available!');
      return { quoteId: null, monthlyRental: null, initialRental: null, p11d: null, co2: null, basicPrice: null, otrPrice: null };
    }

    const assetLines = summary.assetLines || [];
    const assetLine = assetLines[0] || {};
    const schedule = assetLine.schedule || [];

    // Get P11D from asset line
    p11d = p11d || assetLine.p11d || null;

    // Get CO2 emissions (note: Drivalia uses "cO2" not "co2")
    const co2 = assetLine.cO2 ?? null;

    // Get basic vehicle price from subject
    const basicPrice = assetLine.subject?.price ?? null;

    // Get OTR price (On The Road) from assets[0].summary.supplierTotal.gross
    // This is different from summary.assetLines - it's on the root assets array
    let otrPrice = null;
    const assets = storedPricingData?.assets || lastQuoteResponse?.assets || lastQuoteResponse?._pricingData?.assets;
    if (assets?.[0]?.summary?.supplierTotal?.gross) {
      otrPrice = assets[0].summary.supplierTotal.gross;
    }

    console.log('[Drivalia] Additional data - CO2:', co2, 'Basic Price:', basicPrice, 'OTR:', otrPrice);

    // Get initial payment (first in schedule, headline: false)
    const initialPayment = schedule[0] || {};
    const initialRentalExVat = initialPayment.netValue || null;
    const initialRentalIncVat = initialPayment.value || null;

    // Get monthly payment (second in schedule, headline: true)
    const monthlyPayment = schedule[1] || {};
    const monthlyRentalExVat = monthlyPayment.netValue || null;
    const monthlyRentalIncVat = monthlyPayment.value || null;

    // Try to get quote ID from response URL or assets
    let quoteNumber = null;
    if (lastQuoteResponse?._capturedUrl) {
      const urlMatch = lastQuoteResponse._capturedUrl.match(/\/quote\/(\d+)/);
      if (urlMatch) {
        quoteNumber = urlMatch[1];
        console.log('[Drivalia] Quote ID from response URL:', quoteNumber);
      }
    }
    if (!quoteNumber && lastQuoteResponse?.assets?.[0]?.applicationId) {
      quoteNumber = lastQuoteResponse.assets[0].applicationId.toString();
      console.log('[Drivalia] Quote ID from assets:', quoteNumber);
    }

    const result = {
      quoteId: quoteNumber,
      monthlyRental: monthlyRentalExVat,
      monthlyRentalIncVat: monthlyRentalIncVat,
      initialRental: initialRentalExVat,
      initialRentalIncVat: initialRentalIncVat,
      p11d: p11d,
      co2: co2,
      basicPrice: basicPrice,
      otrPrice: otrPrice
    };

    console.log('[Drivalia] Extracted result:', result);

    // Clear stored response
    lastQuoteResponse = null;

    return result;
  } catch (e) {
    console.error('[Drivalia] Error parsing response:', e);
    return { quoteId: null, monthlyRental: null, initialRental: null, p11d: null, co2: null, basicPrice: null, otrPrice: null };
  }
}

console.log('[Drivalia] Content script ready');
