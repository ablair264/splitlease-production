import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userTableViews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

// GET - Get specific view
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [view] = await db
      .select()
      .from(userTableViews)
      .where(
        and(
          eq(userTableViews.id, id),
          eq(userTableViews.userId, session.user.id)
        )
      )
      .limit(1);

    if (!view) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    return NextResponse.json({ view });
  } catch (error) {
    console.error("Error fetching user view:", error);
    return NextResponse.json(
      { error: "Failed to fetch user view" },
      { status: 500 }
    );
  }
}

// PUT - Update view
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      viewName,
      columnOrder,
      columnVisibility,
      columnWidths,
      filters,
      sortBy,
      sortOrder,
      isDefault,
    } = body;

    // Verify ownership
    const [existingView] = await db
      .select()
      .from(userTableViews)
      .where(
        and(
          eq(userTableViews.id, id),
          eq(userTableViews.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingView) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await db
        .update(userTableViews)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(userTableViews.userId, session.user.id),
            eq(userTableViews.tableId, existingView.tableId)
          )
        );
    }

    const [updatedView] = await db
      .update(userTableViews)
      .set({
        viewName: viewName !== undefined ? viewName : existingView.viewName,
        columnOrder: columnOrder !== undefined ? columnOrder : existingView.columnOrder,
        columnVisibility: columnVisibility !== undefined ? columnVisibility : existingView.columnVisibility,
        columnWidths: columnWidths !== undefined ? columnWidths : existingView.columnWidths,
        filters: filters !== undefined ? filters : existingView.filters,
        sortBy: sortBy !== undefined ? sortBy : existingView.sortBy,
        sortOrder: sortOrder !== undefined ? sortOrder : existingView.sortOrder,
        isDefault: isDefault !== undefined ? isDefault : existingView.isDefault,
        updatedAt: new Date(),
      })
      .where(eq(userTableViews.id, id))
      .returning();

    return NextResponse.json({ view: updatedView });
  } catch (error) {
    console.error("Error updating user view:", error);
    return NextResponse.json(
      { error: "Failed to update user view" },
      { status: 500 }
    );
  }
}

// DELETE - Delete view
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const [existingView] = await db
      .select()
      .from(userTableViews)
      .where(
        and(
          eq(userTableViews.id, id),
          eq(userTableViews.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingView) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    await db.delete(userTableViews).where(eq(userTableViews.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user view:", error);
    return NextResponse.json(
      { error: "Failed to delete user view" },
      { status: 500 }
    );
  }
}
