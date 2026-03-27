import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

// Vendor creates an order to a wholesaler
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "VENDOR") return unauthorizedResponse();

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
    if (!vendor) return errorResponse("Vendor profile not found", 404);

    const body = await req.json();
    const { wholesalerId, items } = body;

    if (!wholesalerId || !items || !Array.isArray(items) || items.length === 0) {
      return errorResponse("wholesalerId and items are required");
    }

    const wholesaler = await prisma.wholesaler.findUnique({ where: { id: wholesalerId } });
    if (!wholesaler) return errorResponse("Wholesaler not found", 404);

    let totalCents = 0;
    const processedItems = items.map((item: { productId: string; productType: string; quantity: number; conditioning: string; unitPrice: number }) => {
      const itemTotal = item.quantity * item.unitPrice;
      totalCents += itemTotal;
      return {
        productId: item.productId,
        productType: item.productType,
        quantity: item.quantity,
        conditioning: item.conditioning,
        unitPrice: item.unitPrice,
        totalCents: itemTotal,
      };
    });

    const order = await prisma.order.create({
      data: {
        wholesalerId,
        vendorId: vendor.id,
        items: processedItems,
        totalCents,
        status: "PENDING",
      },
    });

    return jsonResponse({ order }, 201);
  } catch (error) {
    console.error("Create order error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// Get list of wholesalers for vendor to browse
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (search) {
      where.businessName = { contains: search, mode: "insensitive" };
    }

    const wholesalers = await prisma.wholesaler.findMany({
      where,
      orderBy: [{ featured: "desc" }, { businessName: "asc" }],
      include: {
        _count: { select: { wholesalerProducts: true } },
      },
    });

    return jsonResponse({ wholesalers });
  } catch (error) {
    console.error("Wholesalers error:", error);
    return errorResponse("Internal server error", 500);
  }
}
