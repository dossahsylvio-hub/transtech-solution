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

    const sponsored = await prisma.sponsoredProduct.findMany({
      include: { defaultProduct: true },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ sponsored });
  } catch (error) {
    console.error("Admin sponsoring error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (user.email !== ADMIN_EMAIL && user.role !== "ADMIN") return forbiddenResponse();

    const body = await req.json();
    const { defaultProductId, startDate, endDate } = body;

    if (!defaultProductId || !startDate || !endDate) {
      return errorResponse("defaultProductId, startDate, and endDate are required");
    }

    const sponsored = await prisma.sponsoredProduct.create({
      data: {
        defaultProductId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        active: true,
      },
      include: { defaultProduct: true },
    });

    return jsonResponse({ sponsored }, 201);
  } catch (error) {
    console.error("Admin add sponsoring error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (user.email !== ADMIN_EMAIL && user.role !== "ADMIN") return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return errorResponse("id is required");

    await prisma.sponsoredProduct.update({
      where: { id },
      data: { active: false },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Admin delete sponsoring error:", error);
    return errorResponse("Internal server error", 500);
  }
}
