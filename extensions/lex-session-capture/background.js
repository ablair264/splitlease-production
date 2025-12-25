// Background service worker

const API_URL = 'https://splitlease.netlify.app';
const LEX_URL = 'https://associate.lexautolease.co.uk';

// Store session data
let sessionData = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureSession') {
    handleCapture(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'runQuote') {
    runQuoteFromBrowser(message.data)
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
});

async function handleCapture({ csrfToken, cookies, profile }) {
  // Store locally for quote running
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

// Process the quote queue
async function processQuoteQueue() {
  if (!sessionData) {
    throw new Error('No session captured. Please capture session first.');
  }

  // Fetch queue from server
  const queueResponse = await fetch(`${API_URL}/api/lex-autolease/quote-queue`);
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

      // Run the quote
      const result = await runQuoteFromBrowser({
        makeId: item.lexMakeCode,
        modelId: item.lexModelCode,
        variantId: item.lexVariantCode,
        term: item.term,
        mileage: item.mileage,
        paymentPlan: 'spread_3_down', // Default payment plan
        contractType: item.contractType
      });

      // Update status to complete with result
      await updateQueueItem(item.vehicleId, 'complete', {
        quoteId: result.quoteId,
        monthlyRental: result.monthlyRental,
        initialRental: result.initialRental,
        otrp: result.otrp
      });

      processed++;

      // Small delay between quotes to avoid rate limiting
      await sleep(500);

    } catch (error) {
      console.error(`Quote failed for ${item.manufacturer} ${item.model}:`, error);

      // Update status to error
      await updateQueueItem(item.vehicleId, 'error', null, error.message);
      errors++;
    }
  }

  return {
    success: true,
    processed,
    errors
  };
}

// Update queue item status on server
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

// Run a quote directly from the browser (bypasses IP blocking)
async function runQuoteFromBrowser({ makeId, modelId, variantId, term, mileage, paymentPlan, contractType }) {
  if (!sessionData) {
    throw new Error('No session captured. Please capture session first.');
  }

  const { csrfToken } = sessionData;

  // Step 1: Get variant details
  const variantResponse = await fetch(`${LEX_URL}/services/Quote.svc/GetVariant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-csrf-check': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({
      manufacturer: makeId,
      model: modelId,
      variant: variantId
    })
  });

  if (!variantResponse.ok) {
    throw new Error(`GetVariant failed: ${variantResponse.status}`);
  }

  const variantData = await variantResponse.json();

  // Step 2: Calculate quote
  const quotePayload = {
    ManufacturerId: makeId,
    ModelId: modelId,
    VariantId: variantId,
    OTRP: variantData.OTRP || variantData.otrp,
    BPM: variantData.BPM || 0,
    Term: term,
    MPA: mileage,
    MaintenanceIncluded: contractType.includes('maintenance'),
    PaymentPlanId: getPaymentPlanId(paymentPlan),
    ContractTypeId: getContractTypeId(contractType),
    // Optional fields
    BrokerOTRP: null,
    ExcessMileageCharge: null
  };

  const quoteResponse = await fetch(`${LEX_URL}/services/Quote.svc/CalculateQuote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-csrf-check': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(quotePayload)
  });

  if (!quoteResponse.ok) {
    throw new Error(`CalculateQuote failed: ${quoteResponse.status}`);
  }

  const quoteData = await quoteResponse.json();

  // Step 3: Get quote line details
  const lineResponse = await fetch(`${LEX_URL}/services/Quote.svc/GetQuoteLine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-csrf-check': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({
      QuoteId: quoteData.QuoteId || quoteData.quoteId
    })
  });

  if (!lineResponse.ok) {
    throw new Error(`GetQuoteLine failed: ${lineResponse.status}`);
  }

  const lineData = await lineResponse.json();

  return {
    success: true,
    quoteId: quoteData.QuoteId || quoteData.quoteId,
    monthlyRental: lineData.MonthlyRental || lineData.monthlyRental,
    initialRental: lineData.InitialRental || lineData.initialRental,
    otrp: quotePayload.OTRP,
    term,
    mileage
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getPaymentPlanId(plan) {
  const plans = {
    'monthly_in_advance': 1,
    'quarterly_in_advance': 2,
    'annual_in_advance': 3,
    'spread_3_down': 4,
    'spread_6_down': 5,
    'spread_12_down': 6,
    'three_down_terminal_pause': 7,
    'six_down_terminal_pause': 8,
    'nine_down_terminal_pause': 9
  };
  return plans[plan] || 4;
}

function getContractTypeId(type) {
  const types = {
    'contract_hire_without_maintenance': 1,
    'contract_hire_with_maintenance': 2,
    'personal_contract_hire': 3,
    'personal_contract_hire_without_maint': 4,
    'salary_sacrifice': 5
  };
  return types[type] || 1;
}
