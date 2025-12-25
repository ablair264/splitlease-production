// Content script - runs in the context of the Lex page
// Uses DOM automation (like Playwright) instead of API calls
// Intercepts API responses for accurate data extraction

// Store for intercepted API responses
let lastQuoteResponse = null;

// Inject XHR interceptor and alert override into page context
function injectResponseInterceptor() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Override alert to auto-dismiss VED warnings and other alerts
      const originalAlert = window.alert;
      window.alert = function(message) {
        console.log('[LexAuto] Auto-dismissed alert:', message);
        // Don't show the alert - just log it
        // The automation will continue
        return;
      };

      // Also override confirm to auto-accept
      const originalConfirm = window.confirm;
      window.confirm = function(message) {
        console.log('[LexAuto] Auto-accepted confirm:', message);
        return true;
      };

      // Store original XHR
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url) {
        this._lexUrl = url;
        return originalOpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
          // Intercept GetQuote responses
          if (this._lexUrl && this._lexUrl.includes('/services/Quote.svc/GetQuote')) {
            try {
              const data = JSON.parse(this.responseText);
              // Post to content script
              window.postMessage({
                type: 'LEX_QUOTE_RESPONSE',
                data: data
              }, '*');
              console.log('[LexAuto] Intercepted GetQuote response:', data);
            } catch (e) {
              console.error('[LexAuto] Failed to parse GetQuote response:', e);
            }
          }
          // Also intercept Complete responses
          if (this._lexUrl && this._lexUrl.includes('/services/Quote.svc/Complete')) {
            try {
              const data = JSON.parse(this.responseText);
              window.postMessage({
                type: 'LEX_COMPLETE_RESPONSE',
                data: data
              }, '*');
              console.log('[LexAuto] Intercepted Complete response:', data);
            } catch (e) {
              console.error('[LexAuto] Failed to parse Complete response:', e);
            }
          }
        });
        return originalSend.apply(this, arguments);
      };

      console.log('[LexAuto] XHR interceptor installed');
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// Listen for intercepted responses
window.addEventListener('message', (event) => {
  if (event.data?.type === 'LEX_QUOTE_RESPONSE' || event.data?.type === 'LEX_COMPLETE_RESPONSE') {
    lastQuoteResponse = event.data.data;
    console.log('[LexAuto] Stored quote response:', lastQuoteResponse);
  }
});

// Install interceptor on load
injectResponseInterceptor();

const CONTRACT_TYPE_CODES = {
  'contract_hire_with_maintenance': '2',
  'contract_hire_without_maintenance': '5',
  'CH': '2',
  'CHNM': '5'
};

const PAYMENT_PLAN_CODES = {
  'annual_in_advance': '1',
  'monthly_in_advance': '7',
  'quarterly_in_advance': '8',
  'spread_3_down': '23',
  'spread_6_down': '26',
  'spread_9_down': '43',
  'spread_12_down': '27'
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'runQuoteInPage') {
    runQuote(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'testLoadVehicle') {
    testLoadVehicle(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'checkPageReady') {
    // Check if we're on the quote page and form is ready
    const manufacturerSelect = document.querySelector('#selManufacturers');
    sendResponse({
      ready: !!manufacturerSelect,
      url: window.location.href
    });
    return true;
  }
});

// Test loading just make/model/variant (no quote run)
async function testLoadVehicle({ makeId, modelId, variantId }) {
  console.log('[LexAuto] Test loading vehicle:', { makeId, modelId, variantId });

  try {
    // Step 1: Select manufacturer
    const manufacturerSelect = await waitForElement('#selManufacturers');
    console.log('[LexAuto] Manufacturer dropdown found, waiting for it to be ready...');
    await waitForOptionsLoaded(manufacturerSelect);
    manufacturerSelect.value = makeId;
    triggerChange(manufacturerSelect);
    console.log('[LexAuto] Selected manufacturer:', makeId);
    await sleep(1000); // Wait for models AJAX to trigger

    // Step 2: Select model
    const modelSelect = await waitForElement('#selModels');
    console.log('[LexAuto] Waiting for models to load...');
    await waitForOptionsLoaded(modelSelect);
    await sleep(300); // Extra stabilization
    modelSelect.value = modelId;
    triggerChange(modelSelect);
    console.log('[LexAuto] Selected model:', modelId);
    await sleep(1000); // Wait for variants AJAX to trigger

    // Step 3: Select variant
    const variantSelect = await waitForElement('#selVariants');
    console.log('[LexAuto] Waiting for variants to load...');
    await waitForOptionsLoaded(variantSelect);
    await sleep(300); // Extra stabilization
    variantSelect.value = variantId;
    triggerChange(variantSelect);
    console.log('[LexAuto] Selected variant:', variantId);

    // Step 4: Wait for GetOptions to complete
    console.log('[LexAuto] Waiting for GetOptions (CO2 input)...');
    const co2Input = await waitForElement('#txtWltpCo2', 15000);
    await sleep(500); // Extra stabilization
    console.log('[LexAuto] CO2 input visible!');

    // Get the selected option texts for confirmation
    const makeText = manufacturerSelect.options[manufacturerSelect.selectedIndex]?.text || makeId;
    const modelText = modelSelect.options[modelSelect.selectedIndex]?.text || modelId;
    const variantText = variantSelect.options[variantSelect.selectedIndex]?.text || variantId;

    return {
      success: true,
      make: makeText,
      model: modelText,
      variant: variantText,
      co2InputVisible: !!co2Input
    };

  } catch (error) {
    console.error('[LexAuto] Test load failed:', error);
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForElement(selector, timeout = 5000) {
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

function waitForOptionsLoaded(selectEl, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Wait for options to load AND for loading state to clear
    const checkReady = () => {
      const hasOptions = selectEl.options.length > 1;
      const notDisabled = !selectEl.disabled;
      const firstOptionNotLoading = selectEl.options[0]?.text?.toLowerCase() !== 'loading...';
      return hasOptions && notDisabled && firstOptionNotLoading;
    };

    if (checkReady()) {
      // Extra delay to ensure DOM is stable
      setTimeout(resolve, 200);
      return;
    }

    const observer = new MutationObserver(() => {
      if (checkReady()) {
        observer.disconnect();
        setTimeout(resolve, 200);
      }
    });

    observer.observe(selectEl, { childList: true, attributes: true });

    setTimeout(() => {
      observer.disconnect();
      if (checkReady()) {
        resolve();
      } else {
        reject(new Error(`Options did not load for ${selectEl.id}`));
      }
    }, timeout);
  });
}

function triggerChange(element) {
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

// Find option by text (partial match, case-insensitive)
function findOptionByText(selectEl, searchText) {
  const options = Array.from(selectEl.options);
  const lowerSearch = searchText.toLowerCase();

  // First try exact match
  let match = options.find(opt => opt.text.toLowerCase() === lowerSearch);
  if (match) return match.value;

  // Then try starts with
  match = options.find(opt => opt.text.toLowerCase().startsWith(lowerSearch));
  if (match) return match.value;

  // Finally try contains
  match = options.find(opt => opt.text.toLowerCase().includes(lowerSearch));
  if (match) return match.value;

  return null;
}

// Log available options for debugging
function logAvailableOptions(selectEl, label) {
  const options = Array.from(selectEl.options).map(opt => ({
    value: opt.value,
    text: opt.text
  }));
  console.log(`[LexAuto] Available ${label}:`, options);
}

async function runQuote({ makeId, modelId, variantId, term, mileage, contractType, paymentPlan, co2, customOtrp }) {
  console.log('[LexAuto] Starting quote automation:', { makeId, modelId, variantId, term, mileage, co2, customOtrp });

  try {
    // Step 1: Select manufacturer
    const manufacturerSelect = await waitForElement('#selManufacturers');
    console.log('[LexAuto] Manufacturer dropdown found, waiting for it to be ready...');
    await waitForOptionsLoaded(manufacturerSelect);
    manufacturerSelect.value = makeId;
    triggerChange(manufacturerSelect);
    console.log('[LexAuto] Selected manufacturer:', makeId);
    await sleep(1000); // Wait for models AJAX to trigger

    // Step 2: Select model
    const modelSelect = await waitForElement('#selModels');
    console.log('[LexAuto] Waiting for models to load...');
    await waitForOptionsLoaded(modelSelect);
    await sleep(300); // Extra stabilization
    modelSelect.value = modelId;
    triggerChange(modelSelect);
    console.log('[LexAuto] Selected model:', modelId);
    await sleep(1000); // Wait for variants AJAX to trigger

    // Step 3: Select variant
    const variantSelect = await waitForElement('#selVariants');
    console.log('[LexAuto] Waiting for variants to load...');
    await waitForOptionsLoaded(variantSelect);
    await sleep(300); // Extra stabilization
    variantSelect.value = variantId;
    triggerChange(variantSelect);
    console.log('[LexAuto] Selected variant:', variantId);

    // Wait for GetOptions API call to complete - CO2 input becomes visible after this
    console.log('[LexAuto] Waiting for GetOptions to complete (CO2 input to appear)...');
    await waitForElement('#txtWltpCo2', 15000); // Wait up to 15 seconds for CO2 input
    await sleep(800); // Extra buffer for form to stabilize
    console.log('[LexAuto] CO2 input now visible, continuing...');

    // Extract CO2 from the page if not provided or if we want the accurate value
    let actualCo2 = co2;
    const co2Display = document.querySelector('#divWLTPCo2 span');
    if (co2Display) {
      const co2Text = co2Display.textContent || '';
      const co2Match = co2Text.match(/(\d+)/);
      if (co2Match) {
        actualCo2 = parseInt(co2Match[1], 10);
        console.log('[LexAuto] Extracted CO2 from page:', actualCo2, 'g/km');
      }
    }
    // Use the page CO2 value from now on
    co2 = actualCo2;

    // Step 4: Select contract type
    const contractSelect = await waitForElement('#selContracts');
    const contractCode = CONTRACT_TYPE_CODES[contractType] || '5'; // Default to CHNM
    contractSelect.value = contractCode;
    triggerChange(contractSelect);
    console.log('[LexAuto] Selected contract type:', contractCode);
    await sleep(300);

    // Step 5: Select payment plan
    const paymentSelect = await waitForElement('#selPaymentPlan');
    const paymentCode = PAYMENT_PLAN_CODES[paymentPlan] || '23'; // Default to spread_3_down
    paymentSelect.value = paymentCode;
    triggerChange(paymentSelect);
    console.log('[LexAuto] Selected payment plan:', paymentCode);

    // Step 6: Enter term
    const termInput = await waitForElement('#txtTerm');
    termInput.value = term.toString();
    triggerChange(termInput);
    termInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    console.log('[LexAuto] Entered term:', term);

    // Step 7: Enter annual mileage
    const mileageInput = await waitForElement('#txtMPA');
    mileageInput.value = mileage.toString();
    triggerChange(mileageInput);
    mileageInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    console.log('[LexAuto] Entered mileage:', mileage);
    await sleep(300);

    // Step 8: Enter CO2 emission (required for quote)
    if (co2 !== undefined && co2 !== null) {
      // Wait for CO2 input to be ready
      const co2Input = await waitForElement('#txtWltpCo2', 5000);
      if (co2Input) {
        // Clear any existing value first
        co2Input.value = '';
        co2Input.focus();
        await sleep(100);

        // Set the value
        co2Input.value = co2.toString();

        // Trigger all the events the form might need
        co2Input.dispatchEvent(new Event('focus', { bubbles: true }));
        co2Input.dispatchEvent(new Event('input', { bubbles: true }));
        co2Input.dispatchEvent(new Event('change', { bubbles: true }));
        co2Input.dispatchEvent(new Event('blur', { bubbles: true }));

        console.log('[LexAuto] Entered CO2:', co2, 'into input value:', co2Input.value);
        await sleep(500);

        // Check if WLTP validation alert appeared and click Ok if needed
        const wltpOkBtn = document.querySelector('#wltpCalcbtnOk');
        if (wltpOkBtn) {
          console.log('[LexAuto] WLTP validation alert detected, clicking Ok...');
          wltpOkBtn.click();
          await sleep(300);
        }
      } else {
        console.warn('[LexAuto] CO2 input not found (#txtWltpCo2)');
      }
    } else {
      console.warn('[LexAuto] No CO2 value provided');
    }

    // Step 8b: Enter custom Broker OTRP if provided (e.g., Fleet Marque pricing)
    if (customOtrp !== undefined && customOtrp !== null) {
      // customOtrp is in pence, convert to pounds for the form
      const otrpPounds = (customOtrp / 100).toFixed(2);

      const brokerOtrpInput = document.querySelector('#txtBrokerOTRP') ||
                              document.querySelector('input[id*="BrokerOTRP"]') ||
                              document.querySelector('input[id*="OTRP"]');

      if (brokerOtrpInput) {
        brokerOtrpInput.value = otrpPounds;
        triggerChange(brokerOtrpInput);
        console.log('[LexAuto] Entered custom Broker OTRP:', otrpPounds);
        await sleep(200);

        // Tick "Bonus Excluded" checkbox when using custom OTRP
        const bonusExcludedCheckbox = document.querySelector('#chkBonusExcluded');
        if (bonusExcludedCheckbox && !bonusExcludedCheckbox.checked) {
          bonusExcludedCheckbox.click();
          console.log('[LexAuto] Ticked Bonus Excluded checkbox');
          await sleep(200);
        }
      } else {
        console.warn('[LexAuto] Broker OTRP input not found');
      }
    }

    // Step 9: Click Calculate
    const calculateBtn = document.querySelector('a[href*="Calculate"]') ||
                         Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Calculate'));

    if (!calculateBtn) {
      throw new Error('Calculate button not found');
    }

    console.log('[LexAuto] Clicking Calculate...');
    calculateBtn.click();

    // Wait a moment then check for WLTP validation alert
    await sleep(1000);

    // Handle WLTP CO2 validation alert if it appears
    const wltpAlert = document.querySelector('#wltpQuoteCalculateAlert');
    if (wltpAlert && wltpAlert.style.display !== 'none') {
      console.log('[LexAuto] WLTP validation alert detected after Calculate');

      // First click Ok to dismiss the alert
      const okBtn = document.querySelector('#wltpCalcbtnOk');
      if (okBtn) {
        console.log('[LexAuto] Clicking WLTP Ok button to dismiss alert...');
        okBtn.click();
      }

      // Wait for alert to disappear
      console.log('[LexAuto] Waiting for alert to close...');
      await new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          const alert = document.querySelector('#wltpQuoteCalculateAlert');
          if (!alert || alert.style.display === 'none' || !alert.offsetParent) {
            clearInterval(checkClosed);
            resolve();
          }
        }, 100);
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkClosed);
          resolve();
        }, 5000);
      });

      console.log('[LexAuto] Alert closed, waiting for CO2 input...');
      await sleep(1000);

      // Wait for CO2 input to be visible and ready
      const co2Input = await waitForElement('#txtWltpCo2', 5000);
      await sleep(500); // Extra stabilization
      if (co2Input && co2 !== undefined && co2 !== null) {
        co2Input.focus();
        co2Input.value = co2.toString();
        co2Input.dispatchEvent(new Event('input', { bubbles: true }));
        co2Input.dispatchEvent(new Event('change', { bubbles: true }));
        co2Input.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log('[LexAuto] Entered CO2 value after alert:', co2);
        await sleep(500);
      }

      // Click Calculate again
      console.log('[LexAuto] Clicking Calculate again...');
      calculateBtn.click();
      await sleep(1500);
    }

    // Wait for calculation to complete
    await sleep(1500);
    await waitForNetworkIdle();

    // Step 10: Check Commission Disclosure checkbox (dvCommDisc)
    const commDiscDiv = document.querySelector('#dvCommDisc');
    if (commDiscDiv) {
      const checkbox = commDiscDiv.querySelector('input[type="checkbox"]') || commDiscDiv;
      if (checkbox && !checkbox.checked) {
        checkbox.click();
        console.log('[LexAuto] Checked commission disclosure (dvCommDisc)');
        await sleep(300);
      }
    } else {
      // Fallback: try other selectors
      const fallbackCheckbox = document.querySelector('input[type="checkbox"][name*="Commission"]') ||
                               document.querySelector('input[type="checkbox"][id*="Comm"]');
      if (fallbackCheckbox && !fallbackCheckbox.checked) {
        fallbackCheckbox.click();
        console.log('[LexAuto] Checked commission disclosure (fallback)');
        await sleep(300);
      }
    }

    // Step 11: Click Complete
    const completeBtn = document.querySelector('a[href*="Complete"]') ||
                        Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Complete'));

    if (!completeBtn) {
      throw new Error('Complete button not found');
    }

    console.log('[LexAuto] Clicking Complete...');
    completeBtn.click();

    // Wait for completion
    await sleep(2000);
    await waitForNetworkIdle();

    // Step 12: Extract results
    const result = await extractQuoteResult();
    console.log('[LexAuto] Quote completed:', result);

    return {
      success: true,
      ...result,
      term,
      mileage
    };

  } catch (error) {
    console.error('[LexAuto] Quote automation failed:', error);
    throw error;
  }
}

async function waitForNetworkIdle(timeout = 5000) {
  // Simple implementation: just wait a bit for any pending requests
  // In a real implementation, you'd track network activity
  return new Promise(resolve => setTimeout(resolve, 1000));
}

async function extractQuoteResult() {
  // Wait for the API response to be intercepted
  console.log('[LexAuto] Waiting for API response...');

  // Poll for the intercepted response (up to 5 seconds)
  let attempts = 0;
  while (!lastQuoteResponse && attempts < 50) {
    await sleep(100);
    attempts++;
  }

  if (lastQuoteResponse) {
    console.log('[LexAuto] Using intercepted API response:', lastQuoteResponse);

    const variant = lastQuoteResponse.Variants?.[0];
    if (variant) {
      const result = {
        quoteId: lastQuoteResponse.QuoteNo?.toString() || null,
        monthlyRental: variant.MonthlyRental || null,
        monthlyRentalIncVAT: variant.MonthlyRentalIncVAT || null,
        initialRental: variant.InitialPayment || null,
        otrp: variant.OTRP || null,
        brokerOtrp: variant.BrokerOTRP ? Math.round(variant.BrokerOTRP * 100) : null, // Convert to pence
        capCode: variant.CapCode?.trim() || null,
        manufacturer: variant.Manufacturer || null,
        model: variant.Model || null,
        description: variant.Description || null,
        term: variant.Term || null,
        mileage: variant.Mileage || null,
        contractType: variant.ContractType || null,
        taxableListPrice: variant.TaxableListPrice || null
      };

      console.log('[LexAuto] Extracted from API:', result);

      // Clear the stored response for next quote
      lastQuoteResponse = null;

      return result;
    }
  }

  console.warn('[LexAuto] No API response intercepted, falling back to DOM extraction...');

  // Fallback to DOM extraction if API interception failed
  const pageText = document.body.innerText;

  const quoteMatch = pageText.match(/\b(\d{9})\b/);
  const quoteId = quoteMatch ? quoteMatch[1] : null;

  let monthlyRental = null;
  const monthlyMatch = pageText.match(/Monthly\s*Rental[^£\d]*£?([\d,]+\.\d{2})/i);
  if (monthlyMatch) {
    monthlyRental = parseFloat(monthlyMatch[1].replace(/,/g, ''));
  }

  return {
    quoteId,
    monthlyRental,
    initialRental: null,
    otrp: null,
    brokerOtrp: null
  };
}

console.log('[LexAuto] Lex Session Capture content script loaded (DOM automation mode)');
