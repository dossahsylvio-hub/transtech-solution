import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) return unauthorizedResponse();

    // Verify client JWT
    const payload = verifyToken(token);
    if (!payload) return errorResponse("Invalid or expired token", 401);

    // payload should contain clientId
    const clientId = (payload as unknown as { clientId: string }).clientId;
    if (!clientId) return unauthorizedResponse();

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        vendor: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!client) return errorResponse("Client not found", 404);

    // Get vendor's products for catalog display
    const vendorProducts = await prisma.vendorProduct.findMany({
      where: { vendorId: client.vendorId },
    });

    const enrichedProducts = await Promise.all(
      vendorProducts.map(async (vp) => {
        let product = null;
        if (vp.productType === "DefaultProduct") {
          product = await prisma.defaultProduct.findUnique({ where: { id: vp.productId } });
        } else {
          product = await prisma.customProduct.findUnique({ where: { id: vp.productId } });
        }
        return { ...vp, product };
      })
    );

    return jsonResponse({
      client: {
        name: client.name,
        debtBalance: client.debtBalance,
        vendorName: client.vendor.businessName,
        vendorPhone: client.vendor.phone,
      },
      transactions: client.transactions,
      catalog: enrichedProducts,
    });
  } catch (error) {
    console.error("Client portal error:", error);
    return errorResponse("Internal server error", 500);
  }
}
