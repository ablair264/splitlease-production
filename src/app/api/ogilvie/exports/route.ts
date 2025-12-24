import { NextRequest, NextResponse } from "next/server";
import { getOgilvieExports } from "@/lib/scraper/ogilvie";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const exports = await getOgilvieExports(limit);

    // Return exports without the full CSV data to reduce payload size
    const exportsWithoutCsv = exports.map((exp) => ({
      ...exp,
      csvData: exp.csvData ? "[CSV data available]" : null,
      hasCsvData: !!exp.csvData,
    }));

    return NextResponse.json({
      success: true,
      exports: exportsWithoutCsv,
    });
  } catch (error) {
    console.error("Ogilvie exports list API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
