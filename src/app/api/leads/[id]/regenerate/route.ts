import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, leads, brokers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { analyseEnquiry } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get broker
    const broker = await db.query.brokers.findFirst({
      where: eq(brokers.userId, session.user.id),
    });

    if (!broker) {
      return NextResponse.json(
        { error: "Broker not found" },
        { status: 404 }
      );
    }

    // Get lead and verify ownership
    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.brokerId, broker.id)),
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Build enquiry text from raw data
    const rawData = lead.rawData as Record<string, unknown> | null;
    const enquiryText = rawData
      ? (rawData.message as string) ||
        (rawData.enquiry as string) ||
        JSON.stringify(rawData)
      : "";

    // Regenerate with Claude
    const analysis = await analyseEnquiry(
      enquiryText,
      lead.name || undefined,
      lead.email || undefined
    );

    // Update lead with new draft
    await db
      .update(leads)
      .set({
        draftResponse: analysis.draftResponse,
        draftGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));

    return NextResponse.json({
      success: true,
      draftResponse: analysis.draftResponse,
    });
  } catch (error) {
    console.error("Regenerate error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate" },
      { status: 500 }
    );
  }
}
