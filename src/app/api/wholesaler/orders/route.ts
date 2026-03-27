import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    if (user.role === "WHOLESALER") {
      const wholesaler = await prisma.wholesaler.findUnique({ where: { userId: user.userId } });
      if (!wholesaler) return errorResponse("Wholesaler profile not found", 404);

      const where: Record<string, unknown> = { wholesalerId: wholesaler.id };
      if (status) where.status = status;

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { vendor: true },
      });

      return jsonResponse({ orders });
    }

    if (user.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
      if (!vendor) return errorResponse("Vendor profile not found", 404);

      const where: Record<string, unknown> = { vendorId: vendor.id };
      if (status) where.status = status;

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { wholesaler: true },
      });

      return jsonResponse({ orders });
    }

    return unauthorizedResponse();
  } catch (error) {
    console.error("Orders error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "WHOLESALER") return unauthorizedResponse();

    const wholesaler = await prisma.wholesaler.findUnique({ where: { userId: user.userId } });
    if (!wholesaler) return errorResponse("Wholesaler profile not found", 404);

    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) return errorResponse("orderId and status are required");

    const validStatuses = ["CONFIRMED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return errorResponse("Invalid status");
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, wholesalerId: wholesaler.id },
    });
    if (!order) return errorResponse("Order not found", 404);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return jsonResponse({ order: updated });
  } catch (error) {
    console.error("Update order error:", error);
    return errorResponse("Internal server error", 500);
  }
}
