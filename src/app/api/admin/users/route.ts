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

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          vendorProfile: true,
          wholesalerProfile: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const sanitized = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      businessName: u.vendorProfile?.businessName || u.wholesalerProfile?.businessName || "N/A",
      phone: u.vendorProfile?.phone || u.wholesalerProfile?.phone || "N/A",
      createdAt: u.createdAt,
    }));

    return jsonResponse({ users: sanitized, total, page, limit });
  } catch (error) {
    console.error("Admin users error:", error);
    return errorResponse("Internal server error", 500);
  }
}
