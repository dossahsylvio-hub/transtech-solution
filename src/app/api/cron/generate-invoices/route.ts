import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = process.env.CRON_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return errorResponse("Invalid API key", 403);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Collect all PENDING commissions
    const pendingCommissions = await prisma.platformCommission.findMany({
      where: { status: "PENDING" },
      include: {
        transaction: {
          include: { vendor: true },
        },
      },
    });

    // Group by vendor
    const byVendor = new Map<string, number>();
    const commissionIds: string[] = [];

    for (const commission of pendingCommissions) {
      const vendorId = commission.transaction.vendorId;
      const current = byVendor.get(vendorId) || 0;
      byVendor.set(vendorId, current + commission.amountCents);
      commissionIds.push(commission.id);
    }

    // Generate invoices
    const invoices = [];
    for (const [vendorId, totalCents] of byVendor) {
      const invoice = await prisma.invoice.create({
        data: {
          vendorId,
          month: monthStart,
          totalCents,
          status: "UNPAID",
        },
      });
      invoices.push(invoice);
    }

    // Mark commissions as collected
    if (commissionIds.length > 0) {
      await prisma.platformCommission.updateMany({
        where: { id: { in: commissionIds } },
        data: { status: "COLLECTED", collectedAt: now },
      });
    }

    return jsonResponse({
      invoicesGenerated: invoices.length,
      totalCommissionsProcessed: commissionIds.length,
      invoices,
    });
  } catch (error) {
    console.error("Generate invoices error:", error);
    return errorResponse("Internal server error", 500);
  }
}
