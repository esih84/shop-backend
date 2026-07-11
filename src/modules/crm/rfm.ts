/**
 * توابع خالص RFM/سگمنت‌بندی مشتری. بدون وابستگی به دیتابیس تا تست‌پذیر باشند.
 */

export interface CustomerStats {
  orderCount: number;
  totalSpent: number;
  lastPurchaseAt?: Date | null;
}

export interface SegmentThresholds {
  /** حداقل مبلغ کل برای «قهرمان/VIP» (تومان). */
  championMinSpent: number;
  /** مرز روزهای «در معرض ریزش» (بیش از این و کمتر از lostDays). */
  atRiskDays: number;
  /** مرز روزهای «از دست‌رفته». */
  lostDays: number;
  /** حداقل تعداد سفارش برای «وفادار». */
  loyalMinOrders: number;
}

export const DEFAULT_THRESHOLDS: SegmentThresholds = {
  championMinSpent: 5_000_000,
  atRiskDays: 60,
  lostDays: 120,
  loyalMinOrders: 3,
};

/** برچسب‌های سگمنت (کلید یکسان در بک‌اند/داشبورد). */
export const SEGMENTS = [
  'champion',
  'loyal',
  'active',
  'new',
  'at_risk',
  'lost',
  'prospect',
] as const;
export type Segment = (typeof SEGMENTS)[number];

export function daysSince(date: Date | null | undefined, now = new Date()): number | null {
  if (!date) return null;
  const ms = now.getTime() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * سگمنت قاعده‌محور (بدون نیاز به batch؛ همیشه تازه). ترتیب شرط‌ها مهم است.
 */
export function computeSegment(
  s: CustomerStats,
  now = new Date(),
  t: SegmentThresholds = DEFAULT_THRESHOLDS,
): Segment {
  if (!s.orderCount || s.orderCount <= 0 || !s.lastPurchaseAt) return 'prospect';
  const days = daysSince(s.lastPurchaseAt, now) ?? 0;
  if (days > t.lostDays) return 'lost';
  if (days > t.atRiskDays) return 'at_risk';
  // خریداران اخیر (کمتر از atRiskDays روز)
  if (s.totalSpent >= t.championMinSpent && s.orderCount >= 2) return 'champion';
  if (s.orderCount >= t.loyalMinOrders) return 'loyal';
  if (s.orderCount <= 1) return 'new';
  return 'active';
}

/**
 * امتیازدهی کوانتایلی (۱..۵) به یک بردار مقدار. مقدار بزرگ‌تر امتیاز بالاتر
 * (برای Frequency/Monetary). برای Recency باید مقدار «روزهای گذشته» را منفی/معکوس داد.
 */
export function quintileScores(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const scores = new Array<number>(n);
  indexed.forEach((item, rank) => {
    // rank 0..n-1 → امتیاز ۱..۵
    const score = Math.min(5, Math.floor((rank / n) * 5) + 1);
    scores[item.i] = score;
  });
  return scores;
}
