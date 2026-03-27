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

    const subscriptions = await prisma.dataSubscription.findMany({
      orderBy: { startDate: "desc" },
    });

    return jsonResponse({ subscriptions });
  } catch (error) {
    console.error("Data subscriptions error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorizedResponse();
    if (user.email !== ADMIN_EMAIL && user.role !== "ADMIN") return forbiddenResponse();

    const body = await req.json();
    const { companyName, contactEmail, startDate, endDate, monthlyFee } = body;

    if (!companyName || !contactEmail || !startDate || !endDate || !monthlyFee) {
      return errorResponse("All fields are required");
    }

    const subscription = await prisma.dataSubscription.create({
      data: {
        companyName,
        contactEmail,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyFee,
        active: true,
      },
    });

    return jsonResponse({ subscription }, 201);
  } catch (error) {
    console.error("Create data subscription error:", error);
    return errorResponse("Internal server error", 500);
  }
}
