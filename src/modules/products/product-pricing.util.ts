import { Discount, DiscountType } from "./entities/discount.entity";

/**
 * قیمت مؤثرِ محصول پس از اعمال تخفیف فعال را حساب می‌کند — منبع واحد حقیقت برای
 * همه‌ی مسیرهای پول (نمایش محصول، سبد، سفارش، کوپن).
 *
 * تخفیفِ فعال = isActive و در بازه‌ی تاریخ جاری. اگر چند تخفیف فعال باشند، آن‌که
 * بیشترین کاهش قیمت را می‌دهد انتخاب می‌شود. اگر تخفیف فعالی نباشد، قیمت = basePrice
 * و activeDiscount = null.
 */
export function computeEffectivePrice(
  basePrice: number,
  discounts: Discount[] | undefined,
  now: number = Date.now(),
): { price: number; activeDiscount: Discount | null } {
  const base = Number(basePrice);
  let bestPrice = base;
  let best: Discount | null = null;

  for (const d of discounts ?? []) {
    if (!d.isActive) continue;
    if (d.startDate && new Date(d.startDate).getTime() > now) continue;
    if (d.endDate && new Date(d.endDate).getTime() < now) continue;
    const price =
      d.type === DiscountType.PERCENTAGE
        ? base - (base * Number(d.value)) / 100
        : base - Number(d.value);
    const clamped = Math.max(0, Math.round(price));
    if (clamped < bestPrice) {
      bestPrice = clamped;
      best = d;
    }
  }

  return { price: bestPrice, activeDiscount: best };
}
