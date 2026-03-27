import prisma from "./prisma";

interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

function getSmsConfig(): SmsConfig | null {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}

export async function sendSms(
  phone: string,
  message: string,
  clientId: string,
  language: string
): Promise<boolean> {
  const config = getSmsConfig();

  // Log the SMS attempt
  const status = config ? "sent" : "failed";

  try {
    if (config) {
      // Use Twilio REST API
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
      const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: phone,
        From: config.fromNumber,
        Body: message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        await prisma.smsLog.create({
          data: { clientId, phone, message, language, status: "failed" },
        });
        return false;
      }
    }

    await prisma.smsLog.create({
      data: { clientId, phone, message, language, status },
    });
    return config !== null;
  } catch {
    await prisma.smsLog.create({
      data: { clientId, phone, message, language, status: "failed" },
    });
    return false;
  }
}

const smsTemplates: Record<string, { morning: string; evening: string }> = {
  fr: {
    morning: "Bonjour {name}, votre solde actuel est de {amount} FCFA. Merci de régulariser. Bonne journée.",
    evening: "Bonsoir {name}, votre solde actuel est de {amount} FCFA. Merci de régulariser. Bonne soirée.",
  },
  wo: {
    morning: "Salam {name}, sa wàllu bi mu nekk {amount} FCFA. Jërëjëf bu la fey. Baal na la.",
    evening: "Salam {name}, sa wàllu bi mu nekk {amount} FCFA. Jërëjëf bu la fey. Baal na la.",
  },
  ar: {
    morning: "صباح الخير {name}، رصيدك الحالي هو {amount} فرنك. يرجى التسوية. يوم سعيد.",
    evening: "مساء الخير {name}، رصيدك الحالي هو {amount} فرنك. يرجى التسوية. مساء سعيد.",
  },
};

export function getDebtReminderMessage(
  name: string,
  amountCents: number,
  language: string,
  isMorning: boolean
): string {
  const lang = smsTemplates[language] || smsTemplates.fr;
  const template = isMorning ? lang.morning : lang.evening;
  const amountFcfa = Math.ceil(amountCents / 100);
  return template.replace("{name}", name).replace("{amount}", amountFcfa.toString());
}
