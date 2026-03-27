import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, errorResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { linkType, url } = body;

    let vendorId = "unknown";
    if (user.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
      if (vendor) vendorId = vendor.id;
    }

    await prisma.clickTracking.create({
      data: {
        vendorId,
        linkType: linkType || "loan",
        url: url || "",
      },
    });

    return jsonResponse({ tracked: true });
  } catch (error) {
    console.error("Affiliate tracking error:", error);
    return errorResponse("Internal server error", 500);
  }
}
