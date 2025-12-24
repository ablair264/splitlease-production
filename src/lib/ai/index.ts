import OpenAI from "openai";
import type { VehiclePreferences, BudgetInfo } from "@/lib/db/schema";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export type LeadAnalysis = {
  intent: "browsing" | "ready_to_order" | "just_asking" | "unknown";
  customerType: "personal" | "business" | "unknown";
  vehiclePreferences: VehiclePreferences;
  budget: BudgetInfo;
  timeline: string | null;
  score: number;
  scoreReasons: string[];
  draftResponse: string;
};

const SYSTEM_PROMPT = `You are an AI assistant for a UK vehicle leasing broker. Your job is to analyse incoming customer enquiries and help the broker respond quickly and effectively.

You understand:
- UK leasing terminology (PCH, BCH, PCP, HP, Finance Lease)
- Typical customer concerns (monthly cost, mileage allowance, initial payment, delivery time)
- The difference between personal and business leasing
- Common vehicle categories and preferences

When analysing an enquiry, extract:
1. Customer intent (are they ready to order, just browsing, or asking a question?)
2. Whether they're personal or business
3. Vehicle preferences (make, model, body type, fuel type, features)
4. Budget constraints (max monthly, max initial, preferred term/mileage)
5. Timeline (when do they need the vehicle?)

Score leads 1-100 based on:
- Clear intent to lease (not buy) = +20
- Specific vehicle in mind = +15
- Budget mentioned = +15
- Timeline mentioned = +15
- Business customer = +10
- Contact details complete = +10
- Ready to order language = +15

When drafting a response:
- Be helpful and professional, not pushy
- Address their specific questions/needs
- If they mentioned a vehicle, acknowledge it
- If budget is unclear, ask tactfully
- Always offer to discuss options
- Keep it concise (under 150 words)
- Sign off ready for the broker to add their name`;

export async function analyseEnquiry(
  enquiryText: string,
  customerName?: string,
  customerEmail?: string
): Promise<LeadAnalysis> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT + "\n\nAlways respond with valid JSON only.",
      },
      {
        role: "user",
        content: `Analyse this enquiry and respond with JSON only:

Customer: ${customerName || "Unknown"}
Email: ${customerEmail || "Not provided"}

Enquiry:
${enquiryText}

Respond with this exact JSON structure:
{
  "intent": "browsing" | "ready_to_order" | "just_asking" | "unknown",
  "customerType": "personal" | "business" | "unknown",
  "vehiclePreferences": {
    "makes": [],
    "models": [],
    "bodyTypes": [],
    "fuelTypes": [],
    "transmission": null,
    "features": []
  },
  "budget": {
    "maxMonthly": null,
    "maxInitial": null,
    "preferredTerm": null,
    "preferredMileage": null
  },
  "timeline": null,
  "score": 0,
  "scoreReasons": [],
  "draftResponse": ""
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  try {
    return JSON.parse(content) as LeadAnalysis;
  } catch {
    throw new Error(`Failed to parse OpenAI response: ${content}`);
  }
}

export async function generateFollowUp(leadContext: {
  name: string;
  previousMessages: string[];
  vehiclePreferences: VehiclePreferences;
  daysSinceLastContact: number;
}): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 512,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Write a follow-up email for this lead:

Customer: ${leadContext.name}
Days since last contact: ${leadContext.daysSinceLastContact}
Vehicle interests: ${JSON.stringify(leadContext.vehiclePreferences)}

Previous conversation:
${leadContext.previousMessages.join("\n---\n")}

Write a friendly, non-pushy follow-up. Keep it under 100 words. Don't be salesy.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return content;
}
