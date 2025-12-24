import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db, vehicles, vehiclePricing } from "@/lib/db";
import { eq, sql, and, ilike, or, gte, lte } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4o-mini";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface SearchFilters {
  fuelType?: string;
  bodyType?: string;
  transmission?: string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

const systemPrompt = `You are a friendly, knowledgeable vehicle leasing assistant for SplitLease, a UK car and van leasing broker.

Your role is to help customers find their perfect vehicle by understanding their needs and preferences.

IMPORTANT: You must respond with valid JSON in this exact format:
{
  "message": "Your friendly conversational response to the customer",
  "filters": {
    "fuelType": "Petrol" | "Diesel" | "Hybrid Petrol" | "Plug In Hybrid Petrol" | "Plug In Hybrid Diesel" | null,
    "bodyType": "Suv" | "Hatchback" | "Saloon" | "Station Wagon" | "Mpv" | "Roadster" | null,
    "transmission": "Automatic" | "Manual" | null,
    "manufacturer": "brand name or null",
    "minPrice": number or null (monthly budget minimum in pounds),
    "maxPrice": number or null (monthly budget maximum in pounds),
    "search": "general search term or null"
  },
  "shouldSearch": true or false (whether to search for vehicles based on this message)
}

FUEL TYPE MAPPING (use these exact database values):
- "hybrid" → "Hybrid Petrol"
- "plug-in hybrid" or "PHEV" → "Plug In Hybrid Petrol"
- "electric" or "EV" → tell them we specialise in hybrid/plug-in hybrid, search "Plug In Hybrid Petrol"
- "petrol" → "Petrol"
- "diesel" → "Diesel"

BODY TYPE MAPPING (use these exact database values):
- "SUV" or "crossover" → "Suv"
- "hatchback" → "Hatchback"
- "saloon" or "sedan" → "Saloon"
- "estate" or "wagon" or "touring" → "Station Wagon"
- "MPV" or "people carrier" → "Mpv"
- "convertible" or "cabriolet" or "roadster" → "Roadster"

Guidelines:
- Be conversational, warm, and helpful - like a knowledgeable friend helping them choose a car
- Extract any vehicle preferences mentioned (budget, fuel type, body style, brand, etc.)
- If the customer mentions a budget like "under £300", set maxPrice to 300
- If they mention "around £400", set minPrice to 350 and maxPrice to 450
- Use British English spelling and terminology
- Keep responses concise (2-3 sentences for simple queries)
- If the query is just a greeting or unclear, set shouldSearch to false and ask clarifying questions
- Common brand name mappings: "Merc" = "Mercedes", "VW" = "Volkswagen", "Beemer/Bimmer" = "BMW"

Examples:
- "I want a hybrid SUV" → fuelType: "Hybrid Petrol", bodyType: "SUV", shouldSearch: true
- "Something under 300 a month" → maxPrice: 300, shouldSearch: true
- "Hi there" → shouldSearch: false, ask what they're looking for
- "BMW or Audi automatic" → manufacturer: null (can't filter by multiple), search: "BMW Audi", transmission: "Automatic"
`;

async function searchVehicles(filters: SearchFilters, limit = 6) {
  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(vehicles.manufacturer, `%${filters.search}%`),
        ilike(vehicles.model, `%${filters.search}%`),
        ilike(vehicles.variant, `%${filters.search}%`)
      )
    );
  }
  if (filters.manufacturer) {
    conditions.push(ilike(vehicles.manufacturer, `%${filters.manufacturer}%`));
  }
  if (filters.fuelType) {
    conditions.push(ilike(vehicles.fuelType, `%${filters.fuelType}%`));
  }
  if (filters.bodyType) {
    conditions.push(ilike(vehicles.bodyStyle, `%${filters.bodyType}%`));
  }
  if (filters.transmission) {
    conditions.push(ilike(vehicles.transmission, `%${filters.transmission}%`));
  }

  const havingConditions = [
    sql`MIN(CASE WHEN ${vehiclePricing.term} = 36 AND ${vehiclePricing.annualMileage} = 10000 THEN ${vehiclePricing.monthlyRental} END) IS NOT NULL`,
  ];

  if (filters.minPrice) {
    havingConditions.push(
      gte(
        sql`MIN(CASE WHEN ${vehiclePricing.term} = 36 AND ${vehiclePricing.annualMileage} = 10000 THEN ${vehiclePricing.monthlyRental} END)`,
        filters.minPrice * 100
      )
    );
  }
  if (filters.maxPrice) {
    havingConditions.push(
      lte(
        sql`MIN(CASE WHEN ${vehiclePricing.term} = 36 AND ${vehiclePricing.annualMileage} = 10000 THEN ${vehiclePricing.monthlyRental} END)`,
        filters.maxPrice * 100
      )
    );
  }

  const results = await db
    .select({
      id: vehicles.id,
      manufacturer: vehicles.manufacturer,
      model: vehicles.model,
      variant: vehicles.variant,
      fuelType: vehicles.fuelType,
      bodyStyle: vehicles.bodyStyle,
      transmission: vehicles.transmission,
      imageFolder: vehicles.imageFolder,
      minMonthlyRental: sql<number>`MIN(CASE WHEN ${vehiclePricing.term} = 36 AND ${vehiclePricing.annualMileage} = 10000 THEN ${vehiclePricing.monthlyRental} END)`.as(
        "min_monthly_rental"
      ),
    })
    .from(vehicles)
    .leftJoin(vehiclePricing, eq(vehicles.id, vehiclePricing.vehicleId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(vehicles.id)
    .having(and(...havingConditions))
    .orderBy(sql`MIN(CASE WHEN ${vehiclePricing.term} = 36 AND ${vehiclePricing.annualMileage} = 10000 THEN ${vehiclePricing.monthlyRental} END) ASC`)
    .limit(limit);

  return results.map((v) => ({
    id: v.id,
    manufacturer: v.manufacturer,
    model: v.model,
    derivative: v.variant || "",
    fuelType: v.fuelType || "Unknown",
    bodyType: v.bodyStyle || "Unknown",
    transmission: v.transmission || "Unknown",
    imageFolder: v.imageFolder || undefined,
    monthlyPrice: v.minMonthlyRental ? Math.round(v.minMonthlyRental / 100) : 0,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { messages, history = [] } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    // Build conversation for OpenAI
    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((h: ChatMessage) => ({ role: h.role, content: h.content })),
      ...messages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // If JSON parsing fails, return the raw response as message
      return NextResponse.json({
        message: responseText,
        vehicles: [],
        filters: {},
      });
    }

    const { message, filters, shouldSearch } = parsed;

    // Search for vehicles if needed
    let vehicleResults: any[] = [];
    if (shouldSearch && filters) {
      const cleanFilters: SearchFilters = {};
      if (filters.fuelType) cleanFilters.fuelType = filters.fuelType;
      if (filters.bodyType) cleanFilters.bodyType = filters.bodyType;
      if (filters.transmission) cleanFilters.transmission = filters.transmission;
      if (filters.manufacturer) cleanFilters.manufacturer = filters.manufacturer;
      if (filters.minPrice) cleanFilters.minPrice = filters.minPrice;
      if (filters.maxPrice) cleanFilters.maxPrice = filters.maxPrice;
      if (filters.search) cleanFilters.search = filters.search;

      vehicleResults = await searchVehicles(cleanFilters);
    }

    return NextResponse.json({
      message: message || "I'm here to help you find the perfect vehicle. What are you looking for?",
      vehicles: vehicleResults,
      filters: filters || {},
    });
  } catch (error) {
    console.error("Smart search error:", error);
    return NextResponse.json(
      { error: "Smart search failed", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
