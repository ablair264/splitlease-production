import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runFleetMarqueScraper, type ScraperConfig } from "@/lib/scraper/fleet-marque";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sid, phpsessid, email, password, selectedMakes, minDelay, maxDelay, betweenMakes } = body;

    // Require either email/password OR session tokens
    const hasCredentials = email && password;
    const hasSession = sid && phpsessid;

    if (!hasCredentials && !hasSession) {
      return NextResponse.json(
        { error: "Either email/password or session tokens (sid/phpsessid) are required" },
        { status: 400 }
      );
    }

    const config: ScraperConfig = {
      sid,
      phpsessid,
      email,
      password,
      minDelay: minDelay || 1000,
      maxDelay: maxDelay || 3000,
      betweenMakes: betweenMakes || 5000
    };

    // Run the scraper
    const result = await runFleetMarqueScraper(config, selectedMakes);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Fleet Marque scraper error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scraper failed" },
      { status: 500 }
    );
  }
}
