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

    const [
      totalVendors,
      totalWholesalers,
      totalTransactions,
      totalCommissions,
      pendingCommissions,
      collectedCommissions,
      activeSponsored,
      dataSubscriptions,
      totalInvoices,
      paidInvoices,
    ] = await Promise.all([
      prisma.vendor.count(),
      prisma.wholesaler.count(),
      prisma.transaction.count(),
      prisma.platformCommission.aggregate({ _sum: { amountCents: true } }),
      prisma.platformCommission.aggregate({
        where: { status: "PENDING" },
        _sum: { amountCents: true },
      }),
      prisma.platformCommission.aggregate({
        where: { status: "COLLECTED" },
        _sum: { amountCents: true },
      }),
      prisma.sponsoredProduct.count({ where: { active: true } }),
      prisma.dataSubscription.count({ where: { active: true } }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "PAID" } }),
    ]);

    // Revenue from data subscriptions
    const dataRevenue = await prisma.dataSubscription.aggregate({
      where: { active: true },
      _sum: { monthlyFee: true },
    });

    // Monthly transaction volume (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTransactions = await prisma.transaction.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: twelveMonthsAgo } },
      _sum: { totalCents: true, platformFeeCents: true },
      _count: true,
    });

    // Affiliate clicks
    const totalClicks = await prisma.clickTracking.count();

    return jsonResponse({
      totalUsers: totalVendors + totalWholesalers,
      totalVendors,
      totalWholesalers,
      totalTransactions,
      totalCommissions: totalCommissions._sum.amountCents || 0,
      pendingCommissions: pendingCommissions._sum.amountCents || 0,
      collectedCommissions: collectedCommissions._sum.amountCents || 0,
      activeSponsored,
      dataSubscriptions,
      dataRevenue: dataRevenue._sum.monthlyFee || 0,
      totalInvoices,
      paidInvoices,
      totalClicks,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return errorResponse("Internal server error", 500);
  }
}
