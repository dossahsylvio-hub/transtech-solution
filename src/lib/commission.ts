const DEFAULT_PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE || "0.5");

export function calculatePlatformFee(totalCents: number, rate?: number): number {
  const feeRate = rate ?? DEFAULT_PLATFORM_FEE_RATE;
  return Math.floor(totalCents * feeRate / 100);
}
