import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerRates } from "@/lib/db/schema";
import { sql, inArray, and } from "drizzle-orm";
import { getContractTypesForFilters } from "@/lib/rates/types";
import type { ContractTab } from "@/lib/rates/types";

const PROVIDER_LABELS: Record<string, string> = {
  lex: "Lex",
  ogilvie: "Ogilvie",
  venus: "Venus",
  drivalia: "Drivalia",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const tab = (searchParams.get("tab") || "contract-hire") as ContractTab;
    const withMaintenance = searchParams.get("withMaintenance") !== "false";
    const contractTypes = getContractTypesForFilters(tab, withMaintenance);

    const search = searchParams.get("search") || "";
    const manufacturers = searchParams.get("manufacturers")?.split(",").filter(Boolean) || [];
    const providers = searchParams.get("providers")?.split(",").filter(Boolean) || [];
    const fuelTypes = searchParams.get("fuelTypes")?.split(",").filter(Boolean) || [];
    const bodyStyles = searchParams.get("bodyStyles")?.split(",").filter(Boolean) || [];
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const scoreMin = parseInt(searchParams.get("scoreMin") || "0", 10);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(60, Math.max(1, parseInt(searchParams.get("pageSize") || "18", 10)));
    const offset = (page - 1) * pageSize;

    const filters = [sql`pr.vehicle_id IS NOT NULL`];

    if (contractTypes.length > 0) {
      filters.push(sql`pr.contract_type IN (${sql.join(contractTypes.map((ct) => sql`${ct}`), sql`, `)})`);
    }

    if (search) {
      filters.push(
        sql`(
          pr.manufacturer ILIKE ${"%" + search + "%"} OR
          pr.model ILIKE ${"%" + search + "%"} OR
          pr.variant ILIKE ${"%" + search + "%"} OR
          pr.cap_code ILIKE ${"%" + search + "%"}
        )`
      );
    }

    if (manufacturers.length > 0) {
      filters.push(
        sql`pr.manufacturer IN (${sql.join(manufacturers.map((m) => sql`${m.toUpperCase()}`), sql`, `)})`
      );
    }

    if (providers.length > 0) {
      filters.push(sql`pr.provider_code IN (${sql.join(providers.map((p) => sql`${p}`), sql`, `)})`);
    }

    if (fuelTypes.length > 0) {
      filters.push(sql`pr.fuel_type IN (${sql.join(fuelTypes.map((f) => sql`${f}`), sql`, `)})`);
    }

    if (bodyStyles.length > 0) {
      filters.push(sql`pr.body_style IN (${sql.join(bodyStyles.map((b) => sql`${b}`), sql`, `)})`);
    }

    if (minPrice) {
      filters.push(sql`pr.total_rental >= ${Math.round(parseFloat(minPrice) * 100)}`);
    }

    if (maxPrice) {
      filters.push(sql`pr.total_rental <= ${Math.round(parseFloat(maxPrice) * 100)}`);
    }

    // Use stored score from database
    const baseWhereClause = sql`${sql.join(filters, sql` AND `)}`;
    const whereClause = !Number.isNaN(scoreMin) && scoreMin > 0
      ? sql`${baseWhereClause} AND COALESCE(pr.score, 50) >= ${scoreMin}`
      : baseWhereClause;

    const bestDeals = await db.execute(sql`
      WITH filtered AS (
        SELECT
          pr.id,
          pr.vehicle_id,
          pr.cap_code,
          pr.provider_code,
          pr.contract_type,
          pr.term,
          pr.annual_mileage,
          pr.payment_plan,
          pr.total_rental,
          pr.manufacturer,
          pr.model,
          pr.variant,
          pr.fuel_type,
          pr.co2_gkm,
          pr.transmission,
          pr.body_style,
          pr.p11d,
          COALESCE(pr.score, 50) AS value_score,
          v.image_folder,
          v.p11d AS vehicle_p11d
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
        LEFT JOIN vehicles v ON v.id = pr.vehicle_id
        WHERE ${whereClause}
      ),
      best_deals AS (
        SELECT DISTINCT ON (vehicle_id)
          *
        FROM filtered
        ORDER BY vehicle_id, total_rental ASC
      )
      SELECT * FROM best_deals
      ORDER BY value_score DESC NULLS LAST, total_rental ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      WITH filtered AS (
        SELECT pr.vehicle_id
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
        LEFT JOIN vehicles v ON v.id = pr.vehicle_id
        WHERE ${whereClause}
        GROUP BY pr.vehicle_id
      )
      SELECT COUNT(*) AS total
      FROM filtered
    `);

    const total = Number((countResult.rows[0] as { total: number })?.total || 0);

    const dealRows = bestDeals.rows as Array<Record<string, unknown>>;
    const vehicleIds = dealRows.map((row) => row.vehicle_id as string).filter(Boolean);

    let providerMins: Array<{ vehicle_id: string; provider_code: string; min_rental: number }> = [];
    if (vehicleIds.length > 0) {
      const providerMinRows = await db.execute(sql`
        SELECT
          pr.vehicle_id,
          pr.provider_code,
          MIN(pr.total_rental) AS min_rental
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
        WHERE pr.vehicle_id IN (${sql.join(vehicleIds.map((id) => sql`${id}`), sql`, `)})
          AND ${baseWhereClause}
        GROUP BY pr.vehicle_id, pr.provider_code
      `);
      providerMins = providerMinRows.rows as Array<{
        vehicle_id: string;
        provider_code: string;
        min_rental: number;
      }>;
    }

    const providerMap = new Map<string, Array<{ provider_code: string; min_rental: number }>>();
    providerMins.forEach((row) => {
      const existing = providerMap.get(row.vehicle_id) ?? [];
      existing.push({ provider_code: row.provider_code, min_rental: Number(row.min_rental) });
      providerMap.set(row.vehicle_id, existing);
    });

    const deals = dealRows.map((row) => {
      const vehicleId = row.vehicle_id as string;
      const p11dPence = Number(row.p11d ?? row.vehicle_p11d ?? 0);
      // Use stored score from database
      const score = Number(row.value_score ?? 50);

      const providerList = providerMap.get(vehicleId) ?? [];
      const bestProvider = providerList.reduce<{ provider_code: string; min_rental: number } | null>(
        (best, current) => (!best || current.min_rental < best.min_rental ? current : best),
        null
      );

      const providerMiniGrid = [...providerList]
        .sort((a, b) => a.min_rental - b.min_rental)
        .map((item) => ({
          providerCode: item.provider_code,
          providerName: PROVIDER_LABELS[item.provider_code] || item.provider_code.toUpperCase(),
          monthlyRentalGbp: item.min_rental ? Math.round(item.min_rental / 100) : null,
          isBest: bestProvider?.provider_code === item.provider_code,
        }));

      return {
        vehicleId,
        manufacturer: row.manufacturer as string,
        model: row.model as string,
        variant: row.variant as string | null,
        capCode: row.cap_code as string | null,
        fuelType: row.fuel_type as string | null,
        transmission: row.transmission as string | null,
        bodyStyle: row.body_style as string | null,
        co2Gkm: row.co2_gkm ? Number(row.co2_gkm) : null,
        p11dGbp: p11dPence ? Math.round(p11dPence / 100) : null,
        imageUrl: row.image_folder
          ? `/images/vehicles/${row.image_folder as string}/front_view.webp`
          : null,
        score,
        bestDeal: {
          providerCode: row.provider_code as string,
          providerName: PROVIDER_LABELS[String(row.provider_code)] || String(row.provider_code).toUpperCase(),
          contractType: row.contract_type as string,
          term: Number(row.term),
          annualMileage: Number(row.annual_mileage),
          paymentPlan: String(row.payment_plan),
          monthlyRentalGbp: Math.round(Number(row.total_rental) / 100),
        },
        providerMiniGrid,
      };
    });

    const manufacturerOptions = await db
      .selectDistinct({ manufacturer: providerRates.manufacturer })
      .from(providerRates)
      .where(
        and(
          sql`${providerRates.importId} IN (SELECT id FROM ratebook_imports WHERE is_latest = true)`,
          inArray(providerRates.contractType, contractTypes)
        )
      )
      .orderBy(providerRates.manufacturer);

    const fuelTypeOptions = await db
      .selectDistinct({ fuelType: providerRates.fuelType })
      .from(providerRates)
      .where(
        and(
          sql`${providerRates.importId} IN (SELECT id FROM ratebook_imports WHERE is_latest = true)`,
          inArray(providerRates.contractType, contractTypes),
          sql`${providerRates.fuelType} IS NOT NULL`
        )
      )
      .orderBy(providerRates.fuelType);

    const bodyStyleOptions = await db
      .selectDistinct({ bodyStyle: providerRates.bodyStyle })
      .from(providerRates)
      .where(
        and(
          sql`${providerRates.importId} IN (SELECT id FROM ratebook_imports WHERE is_latest = true)`,
          inArray(providerRates.contractType, contractTypes),
          sql`${providerRates.bodyStyle} IS NOT NULL`
        )
      )
      .orderBy(providerRates.bodyStyle);

    return NextResponse.json({
      deals,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
      filterOptions: {
        manufacturers: manufacturerOptions.map((item) => item.manufacturer).filter(Boolean),
        fuelTypes: fuelTypeOptions.map((item) => item.fuelType).filter(Boolean) as string[],
        bodyStyles: bodyStyleOptions.map((item) => item.bodyStyle).filter(Boolean) as string[],
      },
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch deals" },
      { status: 500 }
    );
  }
}
