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

  // Verify we still have Lex cookies
  const lexCookies = await chrome.cookies.getAll({ domain: 'associate.lexautolease.co.uk' });
  console.log('Lex cookies available:', lexCookies.length);
  if (lexCookies.length === 0) {
    throw new Error('No Lex cookies found. Please login to Lex and recapture session.');
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Quote failed for ${item.manufacturer} ${item.model}:`, errorMessage);

      // Update status to error
      await updateQueueItem(item.vehicleId, 'error', null, errorMessage);
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

// Helper to safely parse JSON response
async function safeJsonParse(response, context) {
  const text = await response.text();
  if (!text || text.trim() === '') {
    throw new Error(`${context}: Empty response from server`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    // Log first 200 chars to help debug
    console.error(`${context} - Invalid JSON:`, text.substring(0, 200));
    throw new Error(`${context}: Invalid JSON response`);
  }
}

// Run a quote directly from the browser (bypasses IP blocking)
async function runQuoteFromBrowser({ makeId, modelId, variantId, term, mileage, paymentPlan, contractType }) {
  if (!sessionData) {
    throw new Error('No session captured. Please capture session first.');
  }

  const { csrfToken, cookies } = sessionData;

  // Headers for all Lex API requests - must include cookies manually in service worker
  const lexHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'x-csrf-check': csrfToken,
    'Cookie': cookies
  };

  // Step 1: Get variant details
  const variantPayload = {
    manufacturer: makeId,
    model: modelId,
    variant: variantId
  };
  console.log('GetVariant request:', variantPayload);
  console.log('Using cookies:', cookies ? 'yes (' + cookies.length + ' chars)' : 'NO COOKIES');

  const variantResponse = await fetch(`${LEX_URL}/services/Quote.svc/GetVariant`, {
    method: 'POST',
    headers: lexHeaders,
    body: JSON.stringify(variantPayload)
  });

  console.log('GetVariant response status:', variantResponse.status);
  console.log('GetVariant response headers:', Object.fromEntries(variantResponse.headers.entries()));

  // Check if we got redirected to login page
  const contentType = variantResponse.headers.get('content-type');
  console.log('Content-Type:', contentType);

  if (!variantResponse.ok) {
    const errorText = await variantResponse.text();
    console.error('GetVariant error response:', errorText.substring(0, 200));
    throw new Error(`GetVariant failed: ${variantResponse.status}`);
  }

  const variantData = await safeJsonParse(variantResponse, 'GetVariant');

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
    headers: lexHeaders,
    body: JSON.stringify(quotePayload)
  });

  if (!quoteResponse.ok) {
    const errorText = await quoteResponse.text();
    console.error('CalculateQuote error response:', errorText.substring(0, 200));
    throw new Error(`CalculateQuote failed: ${quoteResponse.status}`);
  }

  const quoteData = await safeJsonParse(quoteResponse, 'CalculateQuote');

  // Step 3: Get quote line details
  const lineResponse = await fetch(`${LEX_URL}/services/Quote.svc/GetQuoteLine`, {
    method: 'POST',
    headers: lexHeaders,
    body: JSON.stringify({
      QuoteId: quoteData.QuoteId || quoteData.quoteId
    })
  });

  if (!lineResponse.ok) {
    const errorText = await lineResponse.text();
    console.error('GetQuoteLine error response:', errorText.substring(0, 200));
    throw new Error(`GetQuoteLine failed: ${lineResponse.status}`);
  }

  const lineData = await safeJsonParse(lineResponse, 'GetQuoteLine');

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
