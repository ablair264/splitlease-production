import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFleetMarqueTerms, getScrapeBatches } from "@/lib/scraper/fleet-marque";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId") || undefined;
  const make = searchParams.get("make") || undefined;
  const minDiscount = searchParams.get("minDiscount") ? Number(searchParams.get("minDiscount")) : undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
  const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;

  try {
    const { terms, total } = await getFleetMarqueTerms({
      batchId,
      make,
      minDiscount,
      limit,
      offset
    });

    return NextResponse.json({ terms, total });
  } catch (error) {
    console.error("Error fetching fleet marque terms:", error);
    return NextResponse.json(
      { error: "Failed to fetch terms" },
      { status: 500 }
    );
  }
}
