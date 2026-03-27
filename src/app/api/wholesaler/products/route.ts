import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();

    // Allow both wholesaler (own products) and vendor (browsing) access
    const { searchParams } = new URL(req.url);
    const wholesalerId = searchParams.get("wholesalerId");

    let targetWholesalerId = wholesalerId;

    if (!targetWholesalerId && user.role === "WHOLESALER") {
      const wholesaler = await prisma.wholesaler.findUnique({ where: { userId: user.userId } });
      if (!wholesaler) return errorResponse("Wholesaler profile not found", 404);
      targetWholesalerId = wholesaler.id;
    }

    if (!targetWholesalerId) return errorResponse("wholesalerId is required");

    const products = await prisma.wholesalerProduct.findMany({
      where: { wholesalerId: targetWholesalerId },
      orderBy: { updatedAt: "desc" },
    });

    // Enrich with product details
    const enriched = await Promise.all(
      products.map(async (wp) => {
        let product = null;
        if (wp.productType === "DefaultProduct") {
          product = await prisma.defaultProduct.findUnique({ where: { id: wp.productId } });
        } else {
          product = await prisma.customProduct.findUnique({ where: { id: wp.productId } });
        }
        return { ...wp, product };
      })
    );

    return jsonResponse({ products: enriched });
  } catch (error) {
    console.error("Wholesaler products error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "WHOLESALER") return unauthorizedResponse();

    const wholesaler = await prisma.wholesaler.findUnique({ where: { userId: user.userId } });
    if (!wholesaler) return errorResponse("Wholesaler profile not found", 404);

    const body = await req.json();

    if (body.createCustom) {
      const custom = await prisma.customProduct.create({
        data: {
          wholesalerId: wholesaler.id,
          name: body.name,
          nameWolof: body.nameWolof || null,
          unit: body.unit,
          price: body.price,
          stock: body.stock || 0,
          imageUrl: body.imageUrl || null,
        },
      });

      const wholesalerProduct = await prisma.wholesalerProduct.create({
        data: {
          wholesalerId: wholesaler.id,
          productId: custom.id,
          productType: "CustomProduct",
          price: custom.price,
          conditioning: body.conditioning || "unité",
          stock: custom.stock,
        },
      });

      return jsonResponse({ wholesalerProduct, customProduct: custom }, 201);
    }

    const { productId, productType, price, conditioning, stock } = body;

    if (!productId || !productType || !conditioning) {
      return errorResponse("productId, productType, and conditioning are required");
    }

    const existing = await prisma.wholesalerProduct.findFirst({
      where: { wholesalerId: wholesaler.id, productId, productType },
    });
    if (existing) return errorResponse("Product already in your catalog", 409);

    const wholesalerProduct = await prisma.wholesalerProduct.create({
      data: {
        wholesalerId: wholesaler.id,
        productId,
        productType,
        price: price || 0,
        conditioning,
        stock: stock || 0,
      },
    });

    return jsonResponse({ wholesalerProduct }, 201);
  } catch (error) {
    console.error("Add wholesaler product error:", error);
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
    const { id, price, conditioning, stock } = body;

    if (!id) return errorResponse("Product id is required");

    const product = await prisma.wholesalerProduct.findFirst({
      where: { id, wholesalerId: wholesaler.id },
    });
    if (!product) return errorResponse("Product not found", 404);

    const updated = await prisma.wholesalerProduct.update({
      where: { id },
      data: {
        ...(price !== undefined && { price }),
        ...(conditioning && { conditioning }),
        ...(stock !== undefined && { stock }),
      },
    });

    return jsonResponse({ wholesalerProduct: updated });
  } catch (error) {
    console.error("Update wholesaler product error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "WHOLESALER") return unauthorizedResponse();

    const wholesaler = await prisma.wholesaler.findUnique({ where: { userId: user.userId } });
    if (!wholesaler) return errorResponse("Wholesaler profile not found", 404);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return errorResponse("Product id is required");

    const product = await prisma.wholesalerProduct.findFirst({
      where: { id, wholesalerId: wholesaler.id },
    });
    if (!product) return errorResponse("Product not found", 404);

    await prisma.wholesalerProduct.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Delete wholesaler product error:", error);
    return errorResponse("Internal server error", 500);
  }
}
