/**
 * LeaseLoco API Client
 * Fetches trending deals with derivative-level detail
 */

// Response types based on actual API response
export interface LeaseLocoVehicle {
  id: number;
  type: number;
  manufacturerName: string;
  manufacturer: number;
  rangeName: string;
  range: number;
  modelName: string;
  model: number;
  trimName: string;
  trim: number;
  derivativeName: string;
  fuelTypeName: string;
  fuelType: number;
  transmissionTypeName: string;
  transmissionType: number;
  driveTypeName: string;
  driveType: number;
  bodyStyleName: string;
  bodyStyle: number;
  engineName: string;
  engine: number;
  doors: number;
  seats: number;
  images: {
    profile: string;
    side: string;
    gallery: string[];
  };
}

export interface LeaseLocoDeal {
  id: number;
  monthlyPrice: number;
  initialPayment: number;
  term: number;
  annualMileage: number;
  financeType: number; // 1 = Personal, 2 = Business
  isInStock: boolean;
  vehicle: LeaseLocoVehicle;
  vehicleTags: Array<{ id: number; name: string }>;
}

export interface LeaseLocoVehiclePrice {
  id: string;
  vehicleId: number;
  monthlyPayment: number;
  initialPaymentTotal: number;
  term: number;
  mileage: number;
  rating: number; // Value score 0-100
  stockStatus: number;
  stockStatusName: string;
  manufacturerName: string;
  rangeName: string;
  modelName: string;
  trimName: string;
  derivativeName: string;
  fuelTypeName: string;
  transmissionTypeName: string;
  bodyStyleName: string;
  driveTypeName: string;
  engineName: string;
  doors: number;
  seats: number;
}

export interface LeaseLocoTrendingDeal {
  vehiclePrice: LeaseLocoVehiclePrice;
  vehicle: LeaseLocoVehicle;
  vehicleTags: Array<{ id: number; name: string }>;
}

export interface LeaseLocoResponse {
  pageProps?: {
    trendingDealList?: LeaseLocoTrendingDeal[];
    trendingDeals?: LeaseLocoDeal[];
    deals?: LeaseLocoDeal[];
  };
}

// LeaseLoco uses Next.js _next/data routes with a buildId that changes
// We'll try to extract it dynamically or use a fallback approach
const LEASELOCO_BASE = 'https://www.leaseloco.com';
const LEASELOCO_IMAGE_BASE = 'https://images.leaseloco.com';

/**
 * Get the current buildId from LeaseLoco
 * Falls back to fetching from homepage if cached value fails
 */
async function getBuildId(): Promise<string> {
  // Try to fetch the homepage and extract buildId from __NEXT_DATA__
  const response = await fetch(LEASELOCO_BASE, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch LeaseLoco homepage: ${response.status}`);
  }

  const html = await response.text();
  const buildIdMatch = html.match(/"buildId":"([^"]+)"/);

  if (!buildIdMatch) {
    throw new Error('Could not extract buildId from LeaseLoco');
  }

  return buildIdMatch[1];
}

/**
 * Fetch trending deals from LeaseLoco
 */
export async function fetchLeaseLocoDeals(): Promise<LeaseLocoTrendingDeal[]> {
  const buildId = await getBuildId();

  const response = await fetch(
    `${LEASELOCO_BASE}/_next/data/${buildId}/car-leasing/search.json`,
    {
      headers: {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        Referer: `${LEASELOCO_BASE}/car-leasing`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`LeaseLoco API error: ${response.status} ${response.statusText}`);
  }

  const data: LeaseLocoResponse = await response.json();

  // Use trendingDealList (new format)
  return data.pageProps?.trendingDealList || [];
}

/**
 * Get full image URL from LeaseLoco path
 */
export function getLeaseLocoImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${LEASELOCO_IMAGE_BASE}/${path}`;
}

/**
 * Normalize LeaseLoco trending deal to our standard format
 */
export function normalizeTrendingDeal(deal: LeaseLocoTrendingDeal) {
  const { vehiclePrice, vehicle } = deal;

  // Build a full derivative string for matching
  const fullDerivative = [
    vehiclePrice.modelName,
    vehiclePrice.trimName,
    vehiclePrice.derivativeName,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    source: 'leaseloco' as const,
    externalId: `leaseloco-${vehiclePrice.id}`,
    manufacturer: vehiclePrice.manufacturerName,
    model: vehiclePrice.rangeName, // rangeName is the model family (e.g., "Capri")
    variant: fullDerivative,
    bodyType: vehiclePrice.bodyStyleName,
    fuelType: vehiclePrice.fuelTypeName,
    monthlyPrice: Math.round(vehiclePrice.monthlyPayment * 100), // Convert to pence
    initialPayment: Math.round(vehiclePrice.initialPaymentTotal * 100),
    term: vehiclePrice.term,
    annualMileage: vehiclePrice.mileage,
    valueScore: vehiclePrice.rating, // LeaseLoco provides a 0-100 rating
    dealCount: 1,
    stockStatus: vehiclePrice.stockStatus === 1 ? 'in_stock' : 'order',
    imageUrl: getLeaseLocoImageUrl(vehicle?.images?.profile || ''),
    leaseType: 'personal',
    vatIncluded: true,
    rawData: deal as unknown as Record<string, unknown>,
  };
}

/**
 * Normalize LeaseLoco deal to our standard format (legacy format)
 */
export function normalizeLeaseLocoDeal(deal: LeaseLocoDeal) {
  const vehicle = deal.vehicle;

  // Build a full derivative string for matching
  const fullDerivative = [
    vehicle.modelName,
    vehicle.trimName,
    vehicle.derivativeName,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    source: 'leaseloco' as const,
    externalId: `leaseloco-${deal.id}`,
    manufacturer: vehicle.manufacturerName,
    model: vehicle.rangeName, // rangeName is the model family (e.g., "5008")
    variant: fullDerivative,
    bodyType: vehicle.bodyStyleName,
    fuelType: vehicle.fuelTypeName,
    monthlyPrice: Math.round(deal.monthlyPrice * 100), // Convert to pence
    initialPayment: Math.round(deal.initialPayment * 100),
    term: deal.term,
    annualMileage: deal.annualMileage,
    valueScore: null, // LeaseLoco doesn't provide a value score in this endpoint
    dealCount: 1,
    stockStatus: deal.isInStock ? 'in_stock' : 'order',
    imageUrl: getLeaseLocoImageUrl(vehicle.images?.profile || ''),
    leaseType: 'personal',
    vatIncluded: true,
    rawData: deal as unknown as Record<string, unknown>,
  };
}

/**
 * Map body style names to standardized values
 */
export function normalizeBodyStyle(bodyStyleName: string): string {
  const mapping: Record<string, string> = {
    'SUV (Small)': 'SUV',
    'SUV (Medium)': 'SUV',
    'SUV (Large)': 'SUV',
    Hatchback: 'Hatchback',
    Saloon: 'Saloon',
    Estate: 'Estate',
    Coupe: 'Coupe',
    Convertible: 'Convertible',
    MPV: 'MPV',
  };
  return mapping[bodyStyleName] || bodyStyleName;
}
