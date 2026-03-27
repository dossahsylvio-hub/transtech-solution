import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "VENDOR") return unauthorizedResponse();

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
    if (!vendor) return errorResponse("Vendor profile not found", 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [salesToday, totalDebt, lowStockProducts, totalClients, recentTransactions] =
      await Promise.all([
        prisma.transaction.aggregate({
          where: { vendorId: vendor.id, createdAt: { gte: today } },
          _sum: { totalCents: true },
          _count: true,
        }),
        prisma.client.aggregate({
          where: { vendorId: vendor.id },
          _sum: { debtBalance: true },
        }),
        prisma.vendorProduct.findMany({
          where: {
            vendorId: vendor.id,
            stock: { lte: prisma.vendorProduct.fields.lowStockAlert ? undefined : 5 },
          },
        }),
        prisma.client.count({ where: { vendorId: vendor.id } }),
        prisma.transaction.findMany({
          where: { vendorId: vendor.id },
          include: { client: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    // Get low stock products manually (Prisma doesn't support field comparison directly)
    const allVendorProducts = await prisma.vendorProduct.findMany({
      where: { vendorId: vendor.id },
    });
    const lowStock = allVendorProducts.filter((p) => p.stock <= p.lowStockAlert);

    return jsonResponse({
      salesToday: salesToday._sum.totalCents || 0,
      salesCount: salesToday._count,
      totalDebt: totalDebt._sum.debtBalance || 0,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock,
      totalClients,
      recentTransactions,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Internal server error", 500);
  }
}
