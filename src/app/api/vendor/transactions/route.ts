import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest, getClientIp } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { computeTransactionHash } from "@/lib/hash";
import { calculatePlatformFee } from "@/lib/commission";
import { PaymentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "VENDOR") return unauthorizedResponse();

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
    if (!vendor) return errorResponse("Vendor profile not found", 404);

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = { vendorId: vendor.id };
    if (clientId) where.clientId = clientId;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { client: true, payments: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return jsonResponse({ transactions, total, page, limit });
  } catch (error) {
    console.error("Transactions error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "VENDOR") return unauthorizedResponse();

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
    if (!vendor) return errorResponse("Vendor profile not found", 404);

    const body = await req.json();
    const { clientId, items, amountPaid } = body;

    if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
      return errorResponse("clientId and items are required");
    }

    // Validate client belongs to vendor
    const client = await prisma.client.findFirst({
      where: { id: clientId, vendorId: vendor.id },
    });
    if (!client) return errorResponse("Client not found", 404);

    // Calculate totals
    let totalCents = 0;
    const processedItems = [];

    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice;
      totalCents += itemTotal;
      processedItems.push({
        productId: item.productId,
        productType: item.productType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalCents: itemTotal,
      });

      // Decrement stock
      if (item.productType === "DefaultProduct" || item.productType === "CustomProduct") {
        const vendorProduct = await prisma.vendorProduct.findFirst({
          where: { vendorId: vendor.id, productId: item.productId, productType: item.productType },
        });
        if (vendorProduct && vendorProduct.stock >= item.quantity) {
          await prisma.vendorProduct.update({
            where: { id: vendorProduct.id },
            data: { stock: vendorProduct.stock - item.quantity },
          });
        }
      }
    }

    const paid = amountPaid || 0;
    const remaining = totalCents - paid;
    let paymentStatus: PaymentStatus = "PAID";
    if (paid === 0) paymentStatus = "UNPAID";
    else if (remaining > 0) paymentStatus = "PARTIAL";

    const platformFeeCents = calculatePlatformFee(totalCents);
    const timestamp = new Date().toISOString();
    const hash = computeTransactionHash({
      vendorId: vendor.id,
      clientId,
      items: processedItems,
      totalCents,
      timestamp,
    });
    const vendorIp = getClientIp(req);

    const transaction = await prisma.transaction.create({
      data: {
        vendorId: vendor.id,
        clientId,
        items: processedItems,
        totalCents,
        paymentStatus,
        amountPaid: paid,
        remaining,
        platformFeeCents,
        hash,
        vendorIp,
      },
      include: { client: true },
    });

    // Create platform commission
    await prisma.platformCommission.create({
      data: {
        transactionId: transaction.id,
        amountCents: platformFeeCents,
      },
    });

    // Update client debt
    if (remaining > 0) {
      await prisma.client.update({
        where: { id: clientId },
        data: { debtBalance: { increment: remaining } },
      });
    }

    // Create payment record if amount paid
    if (paid > 0) {
      await prisma.payment.create({
        data: {
          transactionId: transaction.id,
          amountCents: paid,
          previousDebt: client.debtBalance,
          newDebt: client.debtBalance + remaining,
        },
      });
    }

    return jsonResponse({ transaction }, 201);
  } catch (error) {
    console.error("Create transaction error:", error);
    return errorResponse("Internal server error", 500);
  }
}
