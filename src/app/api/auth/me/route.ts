import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, unauthorizedResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) return unauthorizedResponse();

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        vendorProfile: true,
        wholesalerProfile: true,
      },
    });

    if (!user) return unauthorizedResponse();

    const profile = user.vendorProfile || user.wholesalerProfile;

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessName: profile?.businessName || "Admin",
        phone: profile?.phone || "",
        profileId: profile?.id || null,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return errorResponse("Internal server error", 500);
  }
}
