/**
 * Leasing.com API Client
 * Fetches popular manufacturer ranges (aggregate data at make+model level)
 */

// Response types based on actual API response
export interface LeasingComDeal {
  Manufacturer: string;
  Range: string; // Model name in their terminology
  DealCount: number;
  ImagePath: string;
  LowestInitialPayment: number;
  MinMonthlyPrice: number;
  MinTotalLeaseCost: number;
  MaxLeasingValueScore: number; // Their value score (0-10)
  MaxDeliveryTime: number | null;
  RankingByEnquiryCount: number;
}

export interface LeasingComResponse {
  Items: LeasingComDeal[];
}

export interface LeasingComSearchParams {
  financeType?: 'Personal' | 'Business';
  vehicleType?: 'Car' | 'Van';
  itemsPerPage?: number;
  pageNumber?: number;
}

const DEFAULT_PARAMS: LeasingComSearchParams = {
  financeType: 'Personal',
  vehicleType: 'Car',
  itemsPerPage: 30,
  pageNumber: 1,
};

/**
 * Fetch popular manufacturer ranges from leasing.com
 */
export async function fetchLeasingComDeals(
  params: LeasingComSearchParams = {}
): Promise<LeasingComDeal[]> {
  const mergedParams = { ...DEFAULT_PARAMS, ...params };

  const requestBody = {
    searchCriteria: {
      facets: [],
      matches: [
        { matchWith: mergedParams.vehicleType, fieldName: 'vehicleType' },
        { matchWith: mergedParams.financeType, fieldName: 'FinanceType' },
        null,
        null,
      ],
      ranges: [],
      partialMatches: [],
    },
    pagination: {
      itemsPerPage: mergedParams.itemsPerPage,
      pageNumber: mergedParams.pageNumber,
    },
    orderBy: {
      fieldName: 'popular',
      friendlyName: 'Most popular',
      direction: 'descending',
    },
  };

  const response = await fetch(
    'https://leasing.com/api/deals/search/popular-manufacturer-ranges/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        Origin: 'https://leasing.com',
        Referer: 'https://leasing.com/car-leasing/',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(`Leasing.com API error: ${response.status} ${response.statusText}`);
  }

  const data: LeasingComResponse = await response.json();
  return data.Items || [];
}

/**
 * Normalize leasing.com deal to our standard format
 */
export function normalizeLeasingComDeal(deal: LeasingComDeal) {
  return {
    source: 'leasing_com' as const,
    externalId: `${deal.Manufacturer}-${deal.Range}`.toLowerCase().replace(/\s+/g, '-'),
    manufacturer: deal.Manufacturer,
    model: deal.Range,
    variant: null, // Aggregate data - no variant
    bodyType: null,
    fuelType: null,
    monthlyPrice: Math.round(deal.MinMonthlyPrice * 100), // Convert to pence
    initialPayment: Math.round(deal.LowestInitialPayment * 100),
    term: null, // Not provided at aggregate level
    annualMileage: null,
    valueScore: Math.round(deal.MaxLeasingValueScore * 10), // Convert 0-10 to 0-100
    dealCount: deal.DealCount,
    stockStatus: deal.MaxDeliveryTime === null ? 'order' : 'in_stock',
    imageUrl: deal.ImagePath,
    leaseType: 'personal',
    vatIncluded: true,
    rawData: deal as unknown as Record<string, unknown>,
  };
}
