import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, providerMappings } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET - List all provider mappings
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const mappings = await db.query.providerMappings.findMany({
      orderBy: (m, { asc }) => [asc(m.providerName)],
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error("Error fetching provider mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch mappings" },
      { status: 500 }
    );
  }
}

// POST - Create or update a provider mapping
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { providerName, columnMappings, fileFormat } = body;

    if (!providerName || !columnMappings) {
      return NextResponse.json(
        { error: "Provider name and column mappings are required" },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const existing = await db.query.providerMappings.findFirst({
      where: eq(providerMappings.providerName, providerName),
    });

    if (existing) {
      // Update existing mapping
      await db
        .update(providerMappings)
        .set({
          columnMappings,
          fileFormat: fileFormat || "csv",
          updatedAt: new Date(),
        })
        .where(eq(providerMappings.providerName, providerName));

      return NextResponse.json({
        success: true,
        message: "Mapping updated",
        id: existing.id,
      });
    } else {
      // Create new mapping
      const [newMapping] = await db
        .insert(providerMappings)
        .values({
          providerName,
          columnMappings,
          fileFormat: fileFormat || "csv",
        })
        .returning({ id: providerMappings.id });

      return NextResponse.json({
        success: true,
        message: "Mapping created",
        id: newMapping.id,
      });
    }
  } catch (error) {
    console.error("Error saving provider mapping:", error);
    return NextResponse.json(
      { error: "Failed to save mapping" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a provider mapping
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const providerName = searchParams.get("provider");

    if (!providerName) {
      return NextResponse.json(
        { error: "Provider name is required" },
        { status: 400 }
      );
    }

    await db
      .delete(providerMappings)
      .where(eq(providerMappings.providerName, providerName));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting provider mapping:", error);
    return NextResponse.json(
      { error: "Failed to delete mapping" },
      { status: 500 }
    );
  }
}
