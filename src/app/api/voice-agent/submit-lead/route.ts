import { NextRequest, NextResponse } from "next/server";
import { db, leads, brokers } from "@/lib/db";
import { analyseEnquiry } from "@/lib/ai";
import { findGroupedDeals, formatGroupedDealSummary } from "@/lib/deals";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Extract customer info gathered during the voice call
    const {
      name,
      email,
      phone,
      // Vehicle preferences from conversation
      make,
      model,
      bodyType,
      fuelType,
      transmission,
      // Budget info
      budget,
      mileage,
      term,
      // Conversation context
      conversationSummary,
      customerType, // business or personal
      timeline,
      // Optional: specific broker ID, otherwise use default
      brokerId,
    } = data;

    // Validate required fields
    if (!email && !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide either an email address or phone number to send the quote"
        },
        { status: 400 }
      );
    }

    // Get broker (use provided ID or find default)
    let broker;
    if (brokerId) {
      broker = await db.query.brokers.findFirst({
        where: eq(brokers.id, brokerId),
      });
    } else {
      // Get first broker as default for voice leads
      broker = await db.query.brokers.findFirst();
    }

    if (!broker) {
      return NextResponse.json(
        { success: false, error: "No broker configured" },
        { status: 500 }
      );
    }

    // Build enquiry text from conversation
    const enquiryParts: string[] = [];

    if (conversationSummary) {
      enquiryParts.push(`Conversation summary: ${conversationSummary}`);
    }

    if (make || model) {
      enquiryParts.push(`Vehicle interest: ${[make, model].filter(Boolean).join(" ")}`);
    }

    if (bodyType) {
      enquiryParts.push(`Body type preference: ${bodyType}`);
    }

    if (fuelType) {
      enquiryParts.push(`Fuel type: ${fuelType}`);
    }

    if (transmission) {
      enquiryParts.push(`Transmission: ${transmission}`);
    }

    if (budget) {
      enquiryParts.push(`Monthly budget: £${budget}`);
    }

    if (mileage) {
      enquiryParts.push(`Annual mileage: ${mileage} miles`);
    }

    if (term) {
      enquiryParts.push(`Contract term: ${term} months`);
    }

    if (customerType) {
      enquiryParts.push(`Customer type: ${customerType}`);
    }

    if (timeline) {
      enquiryParts.push(`Timeline: ${timeline}`);
    }

    const enquiryText = enquiryParts.join("\n");

    // Analyse with AI (even though we have structured data, this enriches it)
    const analysis = await analyseEnquiry(enquiryText, name, email);

    // Override analysis with explicit values from voice conversation
    const vehiclePreferences = {
      ...analysis.vehiclePreferences,
      makes: make ? [make] : analysis.vehiclePreferences.makes,
      models: model ? [model] : analysis.vehiclePreferences.models,
      bodyTypes: bodyType ? [bodyType] : analysis.vehiclePreferences.bodyTypes,
      fuelTypes: fuelType ? [fuelType] : analysis.vehiclePreferences.fuelTypes,
      transmission: transmission || analysis.vehiclePreferences.transmission,
    };

    const budgetInfo = {
      ...analysis.budget,
      maxMonthly: budget ? parseFloat(budget) : analysis.budget.maxMonthly,
      preferredMileage: mileage ? parseInt(mileage) : analysis.budget.preferredMileage,
      preferredTerm: term ? parseInt(term) : analysis.budget.preferredTerm,
    };

    // Find grouped matching deals
    const groupedDeals = await findGroupedDeals(
      vehiclePreferences,
      budgetInfo,
      { primaryLimit: 3, alternativesLimit: 3 }
    );

    // Calculate totals
    const totalPrimaryDeals = groupedDeals.primaryMatches.reduce(
      (sum, g) => sum + g.deals.length,
      0
    );
    const totalAlternativeDeals = groupedDeals.alternatives.reduce(
      (sum, g) => sum + g.deals.length,
      0
    );

    // Store lead
    const [lead] = await db.insert(leads).values({
      brokerId: broker.id,
      name: name || null,
      email: email || null,
      phone: phone || null,
      rawData: {
        ...data,
        enquiryText,
        source_type: "voice_agent",
      },
      source: "voice_agent",
      intent: analysis.intent,
      customerType: customerType || analysis.customerType,
      vehiclePreferences,
      budget: budgetInfo,
      timeline: timeline || analysis.timeline,
      score: analysis.score,
      scoreReasons: analysis.scoreReasons,
      draftResponse: analysis.draftResponse,
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

    // Generate quote URL
    const baseUrl = process.env.AUTH_URL || process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:3000";
    const quoteUrl = `${baseUrl}/quote/${lead.id}`;

    // Update draft with quote link
    if (totalPrimaryDeals > 0 || totalAlternativeDeals > 0) {
      const dealsSummary = formatGroupedDealSummary(groupedDeals);
      const enhancedDraft = `${analysis.draftResponse}\n\n${dealsSummary}\n\nView all options and full specs here:\n${quoteUrl}\n\nLet me know if any of these catch your eye, or if you'd like me to find something different.`;

      await db.update(leads)
        .set({ draftResponse: enhancedDraft })
        .where(eq(leads.id, lead.id));
    }

    // Build response for voice agent
    const responseMessage = buildVoiceResponse({
      name,
      email,
      phone,
      totalDeals: totalPrimaryDeals + totalAlternativeDeals,
      quoteUrl,
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      quoteUrl,
      score: analysis.score,
      totalDeals: totalPrimaryDeals + totalAlternativeDeals,
      message: responseMessage,
    });
  } catch (error) {
    console.error("Voice agent submit lead error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sorry, there was an issue saving your enquiry. Please try again.",
        message: "I apologise, but I'm having trouble saving your details right now. Could you give me your email address again and I'll make sure to get this sorted for you?"
      },
      { status: 500 }
    );
  }
}

function buildVoiceResponse(params: {
  name: string | null;
  email: string | null;
  phone: string | null;
  totalDeals: number;
  quoteUrl: string;
}): string {
  const { name, email, phone, totalDeals, quoteUrl } = params;

  const greeting = name ? `Thanks ${name}` : "Thanks";

  if (totalDeals > 0) {
    if (email) {
      return `${greeting}, I've found ${totalDeals} vehicles that match what you're looking for. I'm sending you an email now with all the details and a link to view the full quotes. Is there anything else I can help you with?`;
    } else if (phone) {
      return `${greeting}, I've found ${totalDeals} matching vehicles. I'll send the quote details to your phone. Would you also like me to take your email address so I can send the full information there too?`;
    }
  } else {
    return `${greeting}, I've noted down all your requirements. One of our team will be in touch shortly with some options for you. Is there anything else you'd like to add to your enquiry?`;
  }

  return `${greeting}, I've saved your enquiry. Someone from our team will be in touch soon.`;
}
