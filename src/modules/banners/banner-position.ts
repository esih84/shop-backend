/**
 * جایگاه‌های مجاز بنر — منبع حقیقت.
 * افزودن جایگاه جدید: مقدار را اینجا اضافه کنید و همین لیست را در
 * داشبورد (lib/types/banner.ts) و فروشگاه (types/banner.ts) همگام کنید.
 */
export const BANNER_POSITIONS = [
  "home_main",
  "home_side_top",
  "home_side_bottom",
] as const;

export type BannerPosition = (typeof BANNER_POSITIONS)[number];
