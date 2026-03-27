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

    const vendorProducts = await prisma.vendorProduct.findMany({
      where: { vendorId: vendor.id },
      orderBy: { updatedAt: "desc" },
    });

    // Enrich with product details
    const enriched = await Promise.all(
      vendorProducts.map(async (vp) => {
        let product = null;
        if (vp.productType === "DefaultProduct") {
          product = await prisma.defaultProduct.findUnique({ where: { id: vp.productId } });
        } else {
          product = await prisma.customProduct.findUnique({ where: { id: vp.productId } });
        }
        return {
          ...vp,
          product,
        };
      })
    );

    return jsonResponse({ products: enriched });
  } catch (error) {
    console.error("Vendor products error:", error);
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
    const { productId, productType, price, stock, lowStockAlert } = body;

    // If creating a custom product
    if (body.createCustom) {
      const custom = await prisma.customProduct.create({
        data: {
          vendorId: vendor.id,
          name: body.name,
          nameWolof: body.nameWolof || null,
          unit: body.unit,
          price: body.price,
          stock: body.stock || 0,
          imageUrl: body.imageUrl || null,
        },
      });

      const vendorProduct = await prisma.vendorProduct.create({
        data: {
          vendorId: vendor.id,
          productId: custom.id,
          productType: "CustomProduct",
          price: custom.price,
          stock: custom.stock,
          lowStockAlert: body.lowStockAlert || 5,
        },
      });

      return jsonResponse({ vendorProduct, customProduct: custom }, 201);
    }

    // Adding existing product
    if (!productId || !productType) {
      return errorResponse("productId and productType are required");
    }

    const existing = await prisma.vendorProduct.findFirst({
      where: { vendorId: vendor.id, productId, productType },
    });
    if (existing) return errorResponse("Product already in your catalog", 409);

    const vendorProduct = await prisma.vendorProduct.create({
      data: {
        vendorId: vendor.id,
        productId,
        productType,
        price: price || 0,
        stock: stock || 0,
        lowStockAlert: lowStockAlert || 5,
      },
    });

    return jsonResponse({ vendorProduct }, 201);
  } catch (error) {
    console.error("Add vendor product error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "VENDOR") return unauthorizedResponse();

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
    if (!vendor) return errorResponse("Vendor profile not found", 404);

    const body = await req.json();
    const { id, price, stock, lowStockAlert } = body;

    if (!id) return errorResponse("Product id is required");

    const vendorProduct = await prisma.vendorProduct.findFirst({
      where: { id, vendorId: vendor.id },
    });
    if (!vendorProduct) return errorResponse("Product not found", 404);

    const updated = await prisma.vendorProduct.update({
      where: { id },
      data: {
        ...(price !== undefined && { price }),
        ...(stock !== undefined && { stock }),
        ...(lowStockAlert !== undefined && { lowStockAlert }),
      },
    });

    return jsonResponse({ vendorProduct: updated });
  } catch (error) {
    console.error("Update vendor product error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "VENDOR") return unauthorizedResponse();

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
    if (!vendor) return errorResponse("Vendor profile not found", 404);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return errorResponse("Product id is required");

    const vendorProduct = await prisma.vendorProduct.findFirst({
      where: { id, vendorId: vendor.id },
    });
    if (!vendorProduct) return errorResponse("Product not found", 404);

    await prisma.vendorProduct.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Delete vendor product error:", error);
    return errorResponse("Internal server error", 500);
  }
}
