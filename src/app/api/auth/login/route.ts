import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        vendorProfile: true,
        wholesalerProfile: true,
      },
    });

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return errorResponse("Invalid credentials", 401);
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    const profile = user.vendorProfile || user.wholesalerProfile;

    return jsonResponse({
      token,
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
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
