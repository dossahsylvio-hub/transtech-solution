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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { vendorId: vendor.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    return jsonResponse({ clients });
  } catch (error) {
    console.error("Clients error:", error);
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
    const { name, phone, email, preferredLanguage } = body;

    if (!name || !phone) {
      return errorResponse("Name and phone are required");
    }

    // Check if client already exists for this vendor
    const existing = await prisma.client.findFirst({
      where: { vendorId: vendor.id, phone },
    });
    if (existing) return errorResponse("Client with this phone already exists", 409);

    const client = await prisma.client.create({
      data: {
        vendorId: vendor.id,
        name,
        phone,
        email: email || null,
        preferredLanguage: preferredLanguage || "fr",
      },
    });

    return jsonResponse({ client }, 201);
  } catch (error) {
    console.error("Create client error:", error);
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
    const { id, name, phone, email, preferredLanguage } = body;

    if (!id) return errorResponse("Client id is required");

    const client = await prisma.client.findFirst({
      where: { id, vendorId: vendor.id },
    });
    if (!client) return errorResponse("Client not found", 404);

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(preferredLanguage && { preferredLanguage }),
      },
    });

    return jsonResponse({ client: updated });
  } catch (error) {
    console.error("Update client error:", error);
    return errorResponse("Internal server error", 500);
  }
}
