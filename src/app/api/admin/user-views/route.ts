import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userTableViews } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

// GET - List user's saved views for a table
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get("tableId");

    if (!tableId) {
      return NextResponse.json(
        { error: "tableId is required" },
        { status: 400 }
      );
    }

    const views = await db
      .select()
      .from(userTableViews)
      .where(
        and(
          eq(userTableViews.userId, session.user.id),
          eq(userTableViews.tableId, tableId)
        )
      )
      .orderBy(desc(userTableViews.isDefault), desc(userTableViews.updatedAt));

    return NextResponse.json({ views });
  } catch (error) {
    console.error("Error fetching user views:", error);
    return NextResponse.json(
      { error: "Failed to fetch user views" },
      { status: 500 }
    );
  }
}

// POST - Create new view
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      viewName,
      tableId,
      columnOrder,
      columnVisibility,
      columnWidths,
      filters,
      sortBy,
      sortOrder,
      isDefault,
    } = body;

    if (!viewName || !tableId) {
      return NextResponse.json(
        { error: "viewName and tableId are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await db
        .update(userTableViews)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(userTableViews.userId, session.user.id),
            eq(userTableViews.tableId, tableId)
          )
        );
    }

    const [newView] = await db
      .insert(userTableViews)
      .values({
        userId: session.user.id,
        viewName,
        tableId,
        columnOrder: columnOrder || null,
        columnVisibility: columnVisibility || null,
        columnWidths: columnWidths || null,
        filters: filters || null,
        sortBy: sortBy || null,
        sortOrder: sortOrder || null,
        isDefault: isDefault || false,
      })
      .returning();

    return NextResponse.json({ view: newView }, { status: 201 });
  } catch (error) {
    console.error("Error creating user view:", error);
    return NextResponse.json(
      { error: "Failed to create user view" },
      { status: 500 }
    );
  }
}
