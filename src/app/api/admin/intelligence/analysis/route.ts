import { NextRequest, NextResponse } from 'next/server';
import { generateIntelligenceData } from '@/lib/intelligence/comparison';
import { IntelligenceApiResponse } from '@/lib/intelligence/types';

export const maxDuration = 30; // Allow up to 30 seconds for analysis

/**
 * GET /api/admin/intelligence/analysis
 *
 * Generate market intelligence analysis comparing our rates to Leasing.com
 *
 * Query Parameters:
 * - contractType: CHNM, PCHNM (default: CHNM)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters with defaults
    const contractType = searchParams.get('contractType') || 'CHNM';

    // Validate parameters
    const validContractTypes = ['CHNM', 'PCHNM'];

    if (!validContractTypes.includes(contractType)) {
      return NextResponse.json(
        { success: false, error: `Invalid contract type. Must be one of: ${validContractTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate intelligence data
    const data = await generateIntelligenceData(contractType);

    const response: IntelligenceApiResponse = {
      success: true,
      data,
    };

    return NextResponse.json(response, {
      headers: {
        // Allow caching for 12 hours
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating intelligence analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate intelligence data',
      },
      { status: 500 }
    );
  }
}
