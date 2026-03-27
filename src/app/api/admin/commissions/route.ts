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
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [commissions, total] = await Promise.all([
      prisma.platformCommission.findMany({
        where,
        include: {
          transaction: {
            include: { vendor: true, client: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.platformCommission.count({ where }),
    ]);

    return jsonResponse({ commissions, total, page, limit });
  } catch (error) {
    console.error("Admin commissions error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// Get invoices
export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (user.email !== ADMIN_EMAIL && user.role !== "ADMIN") return forbiddenResponse();

    const body = await req.json();
    const { invoiceId, action } = body;

    if (action === "markPaid" && invoiceId) {
      const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID", paidAt: new Date() },
      });
      return jsonResponse({ invoice });
    }

    // List invoices
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ invoices });
  } catch (error) {
    console.error("Admin invoices error:", error);
    return errorResponse("Internal server error", 500);
  }
}
