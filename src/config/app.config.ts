import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  url: process.env.APP_URL || "http://localhost:3000",
  // آدرس فروشگاه (فرانت) برای بازگشت کاربر پس از پرداخت
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",

  // OTP
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10),
  otpLength: parseInt(process.env.OTP_LENGTH || "5", 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10),

  // Rate limiting
  throttleTtl: parseInt(process.env.THROTTLE_TTL || "60", 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || "100", 10),

  // Loyalty
  pointsPerPurchaseRatio: parseInt(
    process.env.POINTS_PER_PURCHASE_RATIO || "100",
    10,
  ),
  pointsPerReview: parseInt(process.env.POINTS_PER_REVIEW || "10", 10),
  pointsPerReferral: parseInt(process.env.POINTS_PER_REFERRAL || "50", 10),
  birthdayBonusPoints: parseInt(process.env.BIRTHDAY_BONUS_POINTS || "100", 10),
  firstPurchaseBonusPoints: parseInt(
    process.env.FIRST_PURCHASE_BONUS_POINTS || "50",
    10,
  ),

  // SMS
  smsProvider: process.env.SMS_PROVIDER || "kavenegar",
  smsApiKey: process.env.SMS_API_KEY || "",
  smsSender: process.env.SMS_SENDER || "",
  // نام قالب (template) تأییدشده در پنل کاوه‌نگار برای ارسال کد یک‌بارمصرف
  smsTemplate: process.env.SMS_TEMPLATE || "",

  // Email
  mailHost: process.env.MAIL_HOST || "smtp.gmail.com",
  mailPort: parseInt(process.env.MAIL_PORT || "587", 10),
  mailUser: process.env.MAIL_USER || "",
  mailPassword: process.env.MAIL_PASSWORD || "",
  mailFrom: process.env.MAIL_FROM || "noreply@example.com",
}));
