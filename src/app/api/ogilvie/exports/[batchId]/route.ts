import { NextRequest, NextResponse } from "next/server";
import { getOgilvieExport, deleteOgilvieExport } from "@/lib/scraper/ogilvie";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";

    const exportData = await getOgilvieExport(batchId);

    if (!exportData) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    // If download requested, return the CSV as a file
    if (download && exportData.csvData) {
      const filename = `ogilvie_ratebook_${exportData.contractTerm}m_${exportData.contractMileage}mi_${batchId}.csv`;

      return new NextResponse(exportData.csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Otherwise return export metadata
    return NextResponse.json({
      success: true,
      export: {
        ...exportData,
        csvData: exportData.csvData ? "[CSV data available]" : null,
        hasCsvData: !!exportData.csvData,
        csvLength: exportData.csvData?.length || 0,
      },
    });
  } catch (error) {
    console.error("Ogilvie export API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId } = await params;

    await deleteOgilvieExport(batchId);

    return NextResponse.json({
      success: true,
      message: "Export deleted",
    });
  } catch (error) {
    console.error("Ogilvie export delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
