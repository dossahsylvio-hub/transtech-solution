import crypto from "crypto";

const SECRET_KEY = process.env.SECRET_KEY || "dev-secret-key";

export function computeTransactionHash(data: {
  vendorId: string;
  clientId: string;
  items: unknown;
  totalCents: number;
  amountPaid?: number;
  timestamp?: string;
}): string {
  const payload = JSON.stringify({
    vendorId: data.vendorId,
    clientId: data.clientId,
    items: data.items,
    totalCents: data.totalCents,
    amountPaid: data.amountPaid,
    timestamp: data.timestamp,
  });
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");
}

export function verifyTransactionHash(data: {
  vendorId: string;
  clientId: string;
  items: unknown;
  totalCents: number;
  amountPaid?: number;
  timestamp?: string;
}, hash: string): boolean {
  const computed = computeTransactionHash(data);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(computed, "hex")
    );
  } catch {
    return false;
  }
}
