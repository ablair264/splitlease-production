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

// Run a quote directly from the browser (bypasses IP blocking)
async function runQuoteFromBrowser({ makeId, modelId, variantId, term, mileage, paymentPlan, contractType }) {
  if (!sessionData) {
    throw new Error('No session captured. Please capture session first.');
  }

  const { csrfToken, cookies } = sessionData;

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
