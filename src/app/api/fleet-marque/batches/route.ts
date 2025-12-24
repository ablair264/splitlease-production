import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getScrapeBatches, deleteScrapeBatch } from "@/lib/scraper/fleet-marque";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const batches = await getScrapeBatches();
    return NextResponse.json({ batches });
  } catch (error) {
    console.error("Error fetching scrape batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { batchId } = await req.json();

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID required" }, { status: 400 });
    }

    await deleteScrapeBatch(batchId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting batch:", error);
    return NextResponse.json(
      { error: "Failed to delete batch" },
      { status: 500 }
    );
  }
}
