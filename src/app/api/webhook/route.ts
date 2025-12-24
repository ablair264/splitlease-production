import { NextRequest, NextResponse } from "next/server";
import { db, leads, brokers } from "@/lib/db";
import { analyseEnquiry } from "@/lib/ai";
import { findGroupedDeals, formatGroupedDealSummary } from "@/lib/deals";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const signature = headersList.get("x-webhook-signature");
    const brokerId = headersList.get("x-broker-id");

    if (!brokerId) {
      return NextResponse.json(
        { error: "Missing broker ID" },
        { status: 400 }
      );
    }

    // Get broker and verify webhook
    const broker = await db.query.brokers.findFirst({
      where: eq(brokers.id, brokerId),
    });

    if (!broker) {
      return NextResponse.json(
        { error: "Broker not found" },
        { status: 404 }
      );
    }

    const body = await request.text();

    // Verify signature if broker has webhook secret
    if (broker.webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", broker.webhookSecret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const data = JSON.parse(body);

    // Extract common fields (adapt based on source format)
    const name = data.name || data.customer_name || data.fullName || null;
    const email = data.email || data.customer_email || null;
    const phone = data.phone || data.telephone || data.mobile || null;
    const message = data.message || data.enquiry || data.comments || data.notes || "";
    const source = data.source || headersList.get("x-lead-source") || "website";

    // Build enquiry text for AI analysis
    const enquiryText = buildEnquiryText(data, message);

    // Analyse with AI
    const analysis = await analyseEnquiry(enquiryText, name, email);

    // Find grouped matching deals with alternatives
    const groupedDeals = await findGroupedDeals(
      analysis.vehiclePreferences,
      analysis.budget,
      { primaryLimit: 3, alternativesLimit: 3 }
    );

    // Generate quote page URL (will be filled after lead is created)
    let quoteUrl = "";

    // Enhance draft response with deal suggestions if we have matches
    let enhancedDraft = analysis.draftResponse;

    // Calculate total matches for response
    const totalPrimaryDeals = groupedDeals.primaryMatches.reduce(
      (sum, g) => sum + g.deals.length,
      0
    );
    const totalAlternativeDeals = groupedDeals.alternatives.reduce(
      (sum, g) => sum + g.deals.length,
      0
    );

    // Store lead with grouped matched deals
    const [lead] = await db.insert(leads).values({
      brokerId: broker.id,
      name,
      email,
      phone,
      rawData: data,
      source,
      intent: analysis.intent,
      customerType: analysis.customerType,
      vehiclePreferences: analysis.vehiclePreferences,
      budget: analysis.budget,
      timeline: analysis.timeline,
      score: analysis.score,
      scoreReasons: analysis.scoreReasons,
      draftResponse: enhancedDraft, // Will be updated below with quote link
      draftGeneratedAt: new Date(),
      matchedDeals: {
        primaryMatches: groupedDeals.primaryMatches.map((g) => ({
          groupKey: g.groupKey,
          manufacturer: g.manufacturer,
          model: g.model,
          fuelType: g.fuelType,
          transmission: g.transmission,
          bodyStyle: g.bodyStyle,
          avgP11d: g.avgP11d,
          avgCo2: g.avgCo2,
          bestScore: g.bestScore,
          isAlternative: g.isAlternative,
          deals: g.deals.map((d) => ({
            vehicleId: d.vehicleId,
            manufacturer: d.manufacturer,
            model: d.model,
            variant: d.variant,
            monthlyRental: d.monthlyRental,
            term: d.term,
            annualMileage: d.annualMileage,
            score: d.score,
            matchReason: d.matchReason,
          })),
        })),
        alternatives: groupedDeals.alternatives.map((g) => ({
          groupKey: g.groupKey,
          manufacturer: g.manufacturer,
          model: g.model,
          fuelType: g.fuelType,
          transmission: g.transmission,
          bodyStyle: g.bodyStyle,
          avgP11d: g.avgP11d,
          avgCo2: g.avgCo2,
          bestScore: g.bestScore,
          isAlternative: g.isAlternative,
          deals: g.deals.map((d) => ({
            vehicleId: d.vehicleId,
            manufacturer: d.manufacturer,
            model: d.model,
            variant: d.variant,
            monthlyRental: d.monthlyRental,
            term: d.term,
            annualMileage: d.annualMileage,
            score: d.score,
            matchReason: d.matchReason,
          })),
        })),
      },
      status: "new",
    }).returning();

    // Update draft with quote link now that we have the lead ID
    if (totalPrimaryDeals > 0 || totalAlternativeDeals > 0) {
      const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
      quoteUrl = `${baseUrl}/quote/${lead.id}`;

      // Format deals summary for email
      const dealsSummary = formatGroupedDealSummary(groupedDeals);

      enhancedDraft += `\n\n${dealsSummary}\n\nView all options and full specs here:\n${quoteUrl}\n\nLet me know if any of these catch your eye, or if you'd like me to find something different.`;

      // Update the lead with the enhanced draft
      await db.update(leads)
        .set({ draftResponse: enhancedDraft })
        .where(eq(leads.id, lead.id));
    }

    // TODO: Send notification to broker
    // TODO: Auto-respond if broker settings allow

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      score: analysis.score,
      primaryMatches: groupedDeals.primaryMatches.length,
      alternatives: groupedDeals.alternatives.length,
      totalDeals: totalPrimaryDeals + totalAlternativeDeals,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function buildEnquiryText(data: Record<string, unknown>, message: string): string {
  const parts: string[] = [];

  if (message) {
    parts.push(message);
  }

  // Extract vehicle-related fields
  if (data.vehicle || data.make || data.model) {
    parts.push(`Vehicle interest: ${data.vehicle || `${data.make} ${data.model}`}`);
  }

  if (data.budget || data.monthly_budget) {
    parts.push(`Budget: ${data.budget || data.monthly_budget}`);
  }

  if (data.lease_type || data.finance_type) {
    parts.push(`Finance type: ${data.lease_type || data.finance_type}`);
  }

  if (data.mileage || data.annual_mileage) {
    parts.push(`Mileage: ${data.mileage || data.annual_mileage}`);
  }

  if (data.term || data.contract_length) {
    parts.push(`Term: ${data.term || data.contract_length}`);
  }

  if (data.business || data.company_name) {
    parts.push(`Business enquiry: ${data.company_name || "Yes"}`);
  }

  return parts.join("\n");
}
