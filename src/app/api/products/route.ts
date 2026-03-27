import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { nameFr: { contains: search, mode: "insensitive" } },
        { nameWolof: { contains: search, mode: "insensitive" } },
      ];
    }

    // Check for sponsored products
    const now = new Date();
    const sponsoredIds = await prisma.sponsoredProduct.findMany({
      where: { active: true, startDate: { lte: now }, endDate: { gte: now } },
      select: { defaultProductId: true },
    });
    const sponsoredSet = new Set(sponsoredIds.map((s) => s.defaultProductId));

    const [products, total] = await Promise.all([
      prisma.defaultProduct.findMany({ where, skip, take: limit, orderBy: { nameFr: "asc" } }),
      prisma.defaultProduct.count({ where }),
    ]);

    // Sort sponsored products first
    const sorted = products.sort((a, b) => {
      const aSponsored = sponsoredSet.has(a.id) ? 0 : 1;
      const bSponsored = sponsoredSet.has(b.id) ? 0 : 1;
      return aSponsored - bSponsored;
    });

    const result = sorted.map((p) => ({
      ...p,
      sponsored: sponsoredSet.has(p.id),
    }));

    return jsonResponse({ products: result, total, page, limit });
  } catch (error) {
    console.error("Products error:", error);
    return errorResponse("Internal server error", 500);
  }
}
