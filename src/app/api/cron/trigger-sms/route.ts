import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { sendSms, getDebtReminderMessage } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    // Verify cron API key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = process.env.CRON_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return errorResponse("Invalid API key", 403);
    }

    const now = new Date();
    const isMorning = now.getHours() < 12;

    // Find all clients with debt
    const clientsWithDebt = await prisma.client.findMany({
      where: { debtBalance: { gt: 0 } },
      include: { vendor: true },
    });

    let sent = 0;
    let failed = 0;

    for (const client of clientsWithDebt) {
      // Check last SMS sent to this client
      const lastSms = await prisma.smsLog.findFirst({
        where: { clientId: client.id },
        orderBy: { sentAt: "desc" },
      });

      // Determine if we should send (J0, J+5, J+10)
      let shouldSend = false;
      if (!lastSms) {
        shouldSend = true; // J0 - first reminder
      } else {
        const daysSinceLastSms = Math.floor(
          (now.getTime() - lastSms.sentAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastSms >= 5) {
          shouldSend = true; // J+5 or J+10
        }
      }

      if (shouldSend) {
        const message = getDebtReminderMessage(
          client.name,
          client.debtBalance,
          client.preferredLanguage,
          isMorning
        );

        const success = await sendSms(
          client.phone,
          message,
          client.id,
          client.preferredLanguage
        );

        if (success) sent++;
        else failed++;
      }
    }

    return jsonResponse({
      totalClients: clientsWithDebt.length,
      sent,
      failed,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("SMS cron error:", error);
    return errorResponse("Internal server error", 500);
  }
}
