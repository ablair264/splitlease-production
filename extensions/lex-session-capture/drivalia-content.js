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
    console.log('[Drivalia] Stored quote response from interceptor');
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

  try {
    // Ensure we're on the new quote page
    if (!window.location.hash.includes('/quoting/new')) {
      window.location.hash = '/quoting/new';
      await sleep(2000);
    }

    // Step 0: Wait for page to fully load
    console.log('[Drivalia] Waiting for page to load...');
    await sleep(1500);

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
    await sleep(1000);

    // Step 11: Click "Finance" link to expand finance section (from Playwright: getByRole('link', { name: 'Finance' }))
    console.log('[Drivalia] Expanding Finance section...');
    const financeLink = await findByRole('link', 'Finance');
    clickElement(financeLink);
    await sleep(500);

    // Step 12: Set "No. in Advance (financier)" spinbutton
    // From Playwright: getByRole('spinbutton', { name: 'No. in Advance (financier)' })
    console.log('[Drivalia] Setting upfront payments:', upfrontPayments);
    const advanceInput = await findByRole('spinbutton', 'No. in Advance');
    triggerAngularInput(advanceInput, upfrontPayments.toString());
    await sleep(300);

    // Step 13: Enter term (from Playwright: getByRole('spinbutton', { name: 'Term' }))
    console.log('[Drivalia] Entering term:', term);
    const termInput = await findByRole('spinbutton', 'Term');
    triggerAngularInput(termInput, term.toString());
    await sleep(300);

    // Step 14: Enter annual mileage in thousands (from Playwright: getByRole('textbox', { name: 'Annual Mileage (x1000)' }))
    console.log('[Drivalia] Entering mileage:', mileage);
    const mileageInThousands = Math.round(mileage / 1000);
    const mileageInput = await findByRole('textbox', 'Annual Mileage');
    triggerAngularInput(mileageInput, mileageInThousands.toString());
    await sleep(300);

    // Step 15: Click Recalculate (from Playwright: getByRole('button', { name: 'Recalculate' }))
    console.log('[Drivalia] Clicking Recalculate...');
    const recalculateBtn = await findByRole('button', 'Recalculate');
    clickElement(recalculateBtn);
    await sleep(3000); // Wait for calculation

    // Step 16: Click Save Quote (from Playwright: getByRole('button', { name: ' Save Quote' }) - note space)
    console.log('[Drivalia] Saving quote...');
    lastQuoteResponse = null; // Clear previous response
    const saveQuoteBtn = await waitForElementByText('Save Quote', 'button');
    clickElement(saveQuoteBtn);
    await sleep(3000); // Wait for save and response

    // Step 17: Extract results
    const result = await extractQuoteResult();
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

async function extractQuoteResult() {
  // Wait for API response to be intercepted
  let attempts = 0;
  while (!lastQuoteResponse && attempts < 50) {
    await sleep(100);
    attempts++;
  }

  if (lastQuoteResponse) {
    console.log('[Drivalia] Extracting from API response');
    console.log('[Drivalia] Response keys:', Object.keys(lastQuoteResponse));

    try {
      // The Drivalia /calculate response structure:
      // - summary.assetLines[0].p11d - P11D value
      // - summary.assetLines[0].schedule[0] - Initial payment (headline: false)
      // - summary.assetLines[0].schedule[1] - Monthly payment (headline: true)
      // - assets[0].applicationId - Quote ID (only set after save)

      const summary = lastQuoteResponse.summary || {};
      const assetLines = summary.assetLines || [];
      const assetLine = assetLines[0] || {};
      const schedule = assetLine.schedule || [];

      // Get P11D from asset line
      const p11d = assetLine.p11d || null;

      // Get initial payment (first in schedule, headline: false)
      const initialPayment = schedule[0] || {};
      const initialRentalExVat = initialPayment.netValue || null;
      const initialRentalIncVat = initialPayment.value || null;

      // Get monthly payment (second in schedule, headline: true)
      const monthlyPayment = schedule[1] || {};
      const monthlyRentalExVat = monthlyPayment.netValue || null;
      const monthlyRentalIncVat = monthlyPayment.value || null;

      // Get quote number from assets or URL
      const assets = lastQuoteResponse.assets || [];
      let quoteNumber = assets[0]?.applicationId?.toString() || null;

      // If no applicationId, try to get from current URL after save
      if (!quoteNumber && window.location.hash.includes('/quoting/')) {
        const match = window.location.hash.match(/\/quoting\/(\d+)/);
        if (match) {
          quoteNumber = match[1];
        }
      }

      const result = {
        quoteId: quoteNumber,
        monthlyRental: monthlyRentalExVat,
        monthlyRentalIncVat: monthlyRentalIncVat,
        initialRental: initialRentalExVat,
        initialRentalIncVat: initialRentalIncVat,
        p11d: p11d
      };

      console.log('[Drivalia] Extracted result:', result);

      // Clear stored response
      lastQuoteResponse = null;

      return result;
    } catch (e) {
      console.error('[Drivalia] Error parsing response:', e);
    }
  }

  console.warn('[Drivalia] No API response intercepted, attempting DOM extraction...');

  // Fallback: Try to get quote ID from URL
  let quoteId = null;
  if (window.location.hash.includes('/quoting/')) {
    const match = window.location.hash.match(/\/quoting\/(\d+)/);
    if (match) {
      quoteId = match[1];
    }
  }

  // Fallback to DOM extraction
  const pageText = document.body.innerText;

  // Try to find monthly rental in the page
  let monthlyRental = null;
  const rentalMatch = pageText.match(/Monthly[^£\d]*£?([\d,]+\.?\d*)/i) ||
                      pageText.match(/Rental[^£\d]*£?([\d,]+\.?\d*)/i);
  if (rentalMatch) {
    monthlyRental = parseFloat(rentalMatch[1].replace(/,/g, ''));
  }

  return {
    quoteId,
    monthlyRental,
    initialRental: null
  };
}

console.log('[Drivalia] Content script ready');
