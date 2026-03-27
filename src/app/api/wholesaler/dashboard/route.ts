import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "WHOLESALER") return unauthorizedResponse();

    const wholesaler = await prisma.wholesaler.findUnique({ where: { userId: user.userId } });
    if (!wholesaler) return errorResponse("Wholesaler profile not found", 404);

    const [pendingOrders, confirmedOrders, deliveredOrders, allProducts, recentOrders] =
      await Promise.all([
        prisma.order.count({
          where: { wholesalerId: wholesaler.id, status: "PENDING" },
        }),
        prisma.order.count({
          where: { wholesalerId: wholesaler.id, status: "CONFIRMED" },
        }),
        prisma.order.count({
          where: { wholesalerId: wholesaler.id, status: "DELIVERED" },
        }),
        prisma.wholesalerProduct.findMany({
          where: { wholesalerId: wholesaler.id },
        }),
        prisma.order.findMany({
          where: { wholesalerId: wholesaler.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    const lowStock = allProducts.filter((p) => p.stock <= 5);

    const totalRevenue = await prisma.order.aggregate({
      where: { wholesalerId: wholesaler.id, status: "DELIVERED" },
      _sum: { totalCents: true },
    });

    return jsonResponse({
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock,
      totalRevenue: totalRevenue._sum.totalCents || 0,
      recentOrders,
    });
  } catch (error) {
    console.error("Wholesaler dashboard error:", error);
    return errorResponse("Internal server error", 500);
  }
}
