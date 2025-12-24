import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, leads, leadMessages, brokers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { sendLeadResponse } from "@/lib/email";

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
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

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

    if (!lead.email) {
      return NextResponse.json(
        { error: "Lead has no email address" },
        { status: 400 }
      );
    }

    // Send email
    const brokerEmail = session.user.email!;
    await sendLeadResponse(
      lead.email,
      `Re: Your vehicle leasing enquiry`,
      message,
      brokerEmail
    );

    // Log the message
    await db.insert(leadMessages).values({
      leadId: id,
      direction: "outbound",
      channel: "email",
      content: message,
      sentBy: session.user.id,
      aiGenerated: message === lead.draftResponse,
    });

    // Update lead status
    await db
      .update(leads)
      .set({
        status: "contacted",
        contactedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
