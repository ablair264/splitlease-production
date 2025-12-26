// Drivalia Content Script - runs in the context of the Drivalia/CAAF portal
// Uses DOM automation with Angular Material selectors
// Intercepts API responses for accurate data extraction

console.log('[Drivalia] Content script loaded');

// Store for intercepted API responses
let lastQuoteResponse = null;

// Inject XHR interceptor to capture quote responses
function injectResponseInterceptor() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Store original fetch
      const originalFetch = window.fetch;

      window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
          const url = args[0]?.url || args[0];

          // Intercept quote save responses (URL contains the quote number)
          if (url && typeof url === 'string' && url.includes('/application/')) {
            response.clone().json().then(data => {
              window.postMessage({
                type: 'DRIVALIA_QUOTE_RESPONSE',
                data: data,
                url: url
              }, '*');
              console.log('[Drivalia] Intercepted quote response:', url);
            }).catch(() => {});
          }

          return response;
        });
      };

      // Store original XHR
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url) {
        this._drivaliaUrl = url;
        return originalOpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
          // Intercept application/quote responses
          if (this._drivaliaUrl && this._drivaliaUrl.includes('/application/')) {
            try {
              const data = JSON.parse(this.responseText);
              window.postMessage({
                type: 'DRIVALIA_QUOTE_RESPONSE',
                data: data,
                url: this._drivaliaUrl
              }, '*');
              console.log('[Drivalia] Intercepted XHR quote response');
            } catch (e) {}
          }
        });
        return originalSend.apply(this, arguments);
      };

      console.log('[Drivalia] Response interceptor installed');
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// Listen for intercepted responses
window.addEventListener('message', (event) => {
  if (event.data?.type === 'DRIVALIA_QUOTE_RESPONSE') {
    lastQuoteResponse = event.data.data;
    console.log('[Drivalia] Stored quote response');
  }
});

// Install interceptor when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectResponseInterceptor);
} else {
  injectResponseInterceptor();
}

// Product codes for different contract types
const PRODUCT_PATTERNS = {
  'BCH': 'BROKER BCH',           // Business Contract Hire
  'BCHNM': 'BROKER BCH',         // BCH No Maintenance (same product, diff option)
  'PCH': 'BROKER PCH',           // Personal Contract Hire
  'CH': 'BCH'                    // Contract Hire
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

async function runQuote({ capCode, term, mileage, contractType, companyName = 'Quote Test Ltd' }) {
  console.log('[Drivalia] Starting quote automation:', { capCode, term, mileage, contractType });

  try {
    // Ensure we're on the new quote page
    if (!window.location.hash.includes('/quoting/new')) {
      window.location.hash = '/quoting/new';
      await sleep(2000);
    }

    // Step 1: Set Customer Type to Corporate (C)
    console.log('[Drivalia] Setting customer type...');
    const customerTypeSelect = await waitForElement('[aria-label="Customer Type"], #\\34 33, select[ng-model*="customerType"]');
    if (customerTypeSelect.tagName === 'SELECT') {
      customerTypeSelect.value = 'string:C';
      customerTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // It's a mat-select, need to click and select option
      clickElement(customerTypeSelect);
      await sleep(300);
      const corpOption = await waitForElementByText('Corporate', 'mat-option');
      clickElement(corpOption);
    }
    await sleep(500);

    // Step 2: Expand customer section and enter company name
    console.log('[Drivalia] Entering company name...');
    // Click the expand icon if present
    const expandIcon = document.querySelector('.quoting-layout__header-title i, [class*="expand"]');
    if (expandIcon) {
      clickElement(expandIcon);
      await sleep(300);
    }

    const companyInput = await waitForElement('[aria-label="Company Name"], #\\35 60, input[placeholder*="Company"]');
    triggerAngularInput(companyInput, companyName);
    await sleep(300);

    // Step 3: Click "Choose a Vehicle" button
    console.log('[Drivalia] Opening vehicle search...');
    const chooseVehicleBtn = await waitForElementByText('Choose a Vehicle', 'button');
    clickElement(chooseVehicleBtn);
    await sleep(1000);

    // Step 4: Search for vehicle by CAP code
    console.log('[Drivalia] Searching for CAP code:', capCode);
    const vehicleSearchInput = await waitForElement('[aria-label="Search a Vehicle"], input[placeholder*="Search"]');
    triggerAngularInput(vehicleSearchInput, capCode);
    await sleep(1500); // Wait for search results

    // Step 5: Click on the first search result
    console.log('[Drivalia] Selecting vehicle from results...');
    const searchResult = await waitForElement('mat-nav-list mat-list-item, .mat-list-item');
    clickElement(searchResult);
    await sleep(500);

    // Step 6: Click "Use this vehicle" button
    console.log('[Drivalia] Confirming vehicle selection...');
    const useVehicleBtn = await waitForElementByText('Use this vehicle', 'button');
    clickElement(useVehicleBtn);
    await sleep(1000);

    // Step 7: Click "Select a Product" button
    console.log('[Drivalia] Opening product selection...');
    const selectProductBtn = await waitForElementByText('Select a Product', 'button');
    clickElement(selectProductBtn);
    await sleep(1000);

    // Step 8: Select the appropriate product based on contract type
    console.log('[Drivalia] Selecting product for contract type:', contractType);
    const productPattern = PRODUCT_PATTERNS[contractType] || 'BROKER BCH';
    const productOption = await waitForElementByText(productPattern, 'mat-list-option, .mat-list-option');
    clickElement(productOption);
    await sleep(500);

    // Step 9: Click "Use this Product" button
    const useProductBtn = await waitForElementByText('Use this Product', 'button');
    clickElement(useProductBtn);
    await sleep(1000);

    // Step 10: Enter term
    console.log('[Drivalia] Entering term:', term);
    const termInput = await waitForElement('[aria-label*="Term"], input[id*="calcfield"][aria-label*="Term"]');
    triggerAngularInput(termInput, term.toString());
    await sleep(300);

    // Step 11: Enter annual mileage (in thousands for Drivalia)
    console.log('[Drivalia] Entering mileage:', mileage);
    const mileageInThousands = Math.round(mileage / 1000);
    const mileageInput = await waitForElement('[aria-label*="Annual Mileage"], input[id*="calcfield"][aria-label*="Mileage"]');
    triggerAngularInput(mileageInput, mileageInThousands.toString());
    await sleep(300);

    // Step 12: Click Recalculate
    console.log('[Drivalia] Clicking Recalculate...');
    const recalculateBtn = await waitForElementByText('Recalculate', 'button');
    clickElement(recalculateBtn);
    await sleep(2000); // Wait for calculation

    // Step 13: Click Save Quote
    console.log('[Drivalia] Saving quote...');
    lastQuoteResponse = null; // Clear previous response
    const saveQuoteBtn = await waitForElementByText('Save Quote', 'button');
    clickElement(saveQuoteBtn);
    await sleep(3000); // Wait for save and response

    // Step 14: Extract results
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

    try {
      // Extract from the response structure
      const assets = lastQuoteResponse.assets || [];
      const asset = assets[0]?.asset || {};
      const finance = lastQuoteResponse.finance || {};
      const cashFlow = finance.cashFlow || {};
      const lines = cashFlow.lines || [];

      // Get CAP code
      const catalogXrefCode = asset.catalogXref?.catalogXrefCode ||
                             asset.data?.items?.[0]?.catalogXrefCode ||
                             null;

      // Get pricing from cashflow
      const initialPayment = lines[0]?.totalPayment || null;
      const monthlyPayment = lines[1]?.totalPayment || lines[1]?.instalment || null;
      const monthlyRentalExVat = lines[1]?.instalment || null;

      // Get quote number from URL or response
      const quoteNumber = lastQuoteResponse.applicationId?.toString() || null;

      const result = {
        quoteId: quoteNumber,
        capCode: catalogXrefCode,
        monthlyRental: monthlyRentalExVat,
        monthlyRentalIncVat: monthlyPayment,
        initialRental: initialPayment,
        p11d: asset.catalogValue || asset.data?.items?.[0]?.catalogValue || null
      };

      // Clear stored response
      lastQuoteResponse = null;

      return result;
    } catch (e) {
      console.error('[Drivalia] Error parsing response:', e);
    }
  }

  console.warn('[Drivalia] No API response intercepted, attempting DOM extraction...');

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
    quoteId: null,
    monthlyRental,
    initialRental: null
  };
}

console.log('[Drivalia] Content script ready');
