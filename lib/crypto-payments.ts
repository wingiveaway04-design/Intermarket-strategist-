export const USDT_TRC20_WALLET = "TVkQi92uX9fb3uu4VbYzdG9z7UdMeF84we";

export function getUsdtPlanPrice(plan: "monthly" | "yearly") {
  const raw = plan === "monthly" ? process.env.USDT_MONTHLY_PRICE : process.env.USDT_YEARLY_PRICE;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function isValidTronTxHash(value: string) {
  return /^[a-fA-F0-9]{64}$/.test(value.trim());
}
