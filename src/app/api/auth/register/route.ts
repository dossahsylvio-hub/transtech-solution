import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role, businessName, phone } = body;

    if (!email || !password || !role || !businessName || !phone) {
      return errorResponse("All fields are required");
    }

    if (!["VENDOR", "WHOLESALER"].includes(role)) {
      return errorResponse("Invalid role. Must be VENDOR or WHOLESALER");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("Email already in use", 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role as Role,
        ...(role === "VENDOR"
          ? { vendorProfile: { create: { businessName, phone } } }
          : { wholesalerProfile: { create: { businessName, phone } } }),
      },
      include: {
        vendorProfile: true,
        wholesalerProfile: true,
      },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return jsonResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessName,
        phone,
        profileId: user.vendorProfile?.id || user.wholesalerProfile?.id,
      },
    }, 201);
  } catch (error) {
    console.error("Register error:", error);
    return errorResponse("Internal server error", 500);
  }
}
