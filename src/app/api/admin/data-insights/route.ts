import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-helpers";

const ADMIN_EMAIL = "pauledoux@protonmail.com";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (user.email !== ADMIN_EMAIL && user.role !== "ADMIN") return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format"); // "csv" or "json"

    // Sales by category (anonymized)
    const allTransactions = await prisma.transaction.findMany({
      select: { items: true, totalCents: true, createdAt: true },
    });

    // Aggregate by category
    const categoryStats = new Map<string, { count: number; totalCents: number }>();

    for (const tx of allTransactions) {
      const items = tx.items as Array<{ productId: string; productType: string; quantity: number; totalCents: number }>;
      for (const item of items) {
        if (item.productType === "DefaultProduct") {
          const product = await prisma.defaultProduct.findUnique({
            where: { id: item.productId },
            select: { category: true },
          });
          if (product) {
            const current = categoryStats.get(product.category) || { count: 0, totalCents: 0 };
            current.count += item.quantity;
            current.totalCents += item.totalCents;
            categoryStats.set(product.category, current);
          }
        }
      }
    }

    const categoryData = Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      totalSold: stats.count,
      totalRevenue: stats.totalCents,
    }));

    // Top products
    const productStats = new Map<string, { name: string; count: number; totalCents: number }>();

    for (const tx of allTransactions) {
      const items = tx.items as Array<{ productId: string; productType: string; quantity: number; totalCents: number }>;
      for (const item of items) {
        let name = "Unknown";
        if (item.productType === "DefaultProduct") {
          const p = await prisma.defaultProduct.findUnique({ where: { id: item.productId }, select: { nameFr: true } });
          if (p) name = p.nameFr;
        }
        const current = productStats.get(item.productId) || { name, count: 0, totalCents: 0 };
        current.count += item.quantity;
        current.totalCents += item.totalCents;
        productStats.set(item.productId, current);
      }
    }

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 20);

    const insights = {
      categoryData,
      topProducts,
      totalTransactions: allTransactions.length,
      totalVolume: allTransactions.reduce((sum, t) => sum + t.totalCents, 0),
    };

    if (format === "csv") {
      const csvHeader = "Category,Total Sold,Total Revenue (FCFA)\n";
      const csvBody = categoryData
        .map((c) => `${c.category},${c.totalSold},${Math.ceil(c.totalRevenue / 100)}`)
        .join("\n");

      return new Response(csvHeader + csvBody, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=data-insights.csv",
        },
      });
    }

    return jsonResponse(insights);
  } catch (error) {
    console.error("Data insights error:", error);
    return errorResponse("Internal server error", 500);
  }
}
