import { Coupon, CouponScope, CouponType } from "./entities/coupon.entity";

/** یک قلم سبد برای محاسبه‌ی تخفیف (مستقل از انتیتی‌ها تا در هر دو نقطه‌ی محاسبه استفاده شود). */
export interface CouponLine {
  productId: string;
  categoryId?: string | null;
  unitPrice: number;
  quantity: number;
  /** آیا خودِ محصول تخفیف فعال دارد؟ چنین اقلامی از شمول کوپن خارج‌اند. */
  hasProductDiscount?: boolean;
}

/** آیا این قلم مشمول دامنه‌ی (scope) کوپن است؟ */
function isLineEligible(coupon: Coupon, line: CouponLine): boolean {
  // اقلامی که خودشان تخفیف محصول دارند مشمول کوپن نمی‌شوند («تخفیف روی تخفیف» ممنوع).
  if (line.hasProductDiscount) return false;
  switch (coupon.scope) {
    case CouponScope.PRODUCT:
      return (coupon.products ?? []).some((p) => p.id === line.productId);
    case CouponScope.CATEGORY:
      return (
        line.categoryId != null &&
        (coupon.categories ?? []).some((c) => c.id === line.categoryId)
      );
    case CouponScope.CART:
    default:
      return true;
  }
}

/** جمع مبلغ اقلامی که مشمول دامنه‌ی کوپن‌اند. */
export function eligibleSubtotal(coupon: Coupon, lines: CouponLine[]): number {
  return lines
    .filter((line) => isLineEligible(coupon, line))
    .reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
}

/**
 * مبلغ تخفیف بر اساس CouponType، فقط روی جمع اقلام واجد شرایط (eligibleSubtotal).
 * percentage: درصدی با سقف اختیاری maxDiscount؛ fixed: مبلغ ثابت کپ‌شده تا جمع واجد شرایط؛
 * free_shipping: صفر (روی هزینه‌ی ارسال اثر دارد نه روی اقلام).
 */
export function calcCouponDiscount(
  coupon: Coupon,
  lines: CouponLine[],
): number {
  const base = eligibleSubtotal(coupon, lines);
  if (base <= 0) return 0;

  if (coupon.type === CouponType.PERCENTAGE) {
    let discount = (base * Number(coupon.value)) / 100;
    if (coupon.maxDiscount) {
      discount = Math.min(discount, Number(coupon.maxDiscount));
    }
    return discount;
  }

  if (coupon.type === CouponType.FIXED) {
    return Math.min(Number(coupon.value), base);
  }

  return 0; // free_shipping
}
