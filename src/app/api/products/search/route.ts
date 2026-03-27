import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || q.length < 2) return jsonResponse({ products: [] });

    const products = await prisma.defaultProduct.findMany({
      where: {
        OR: [
          { nameFr: { contains: q, mode: "insensitive" } },
          { nameWolof: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { nameFr: "asc" },
    });

    return jsonResponse({ products });
  } catch (error) {
    console.error("Search error:", error);
    return errorResponse("Internal server error", 500);
  }
}
