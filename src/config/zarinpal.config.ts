import { registerAs } from "@nestjs/config";

/**
 * پیکربندی درگاه پرداخت زرین‌پال (حالت sandbox برای تست).
 * https://www.zarinpal.com/docs/paymentGateway/sandBox.html
 */
export default registerAs("zarinpal", () => ({
  merchantId:
    process.env.ZARINPAL_MERCHANT_ID ||
    "00000000-0000-0000-0000-000000000000",
  requestUrl:
    process.env.ZARINPAL_REQUEST_URL ||
    "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
  verifyUrl:
    process.env.ZARINPAL_VERIFY_URL ||
    "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
  gatewayUrl:
    process.env.ZARINPAL_GATEWAY_URL ||
    "https://sandbox.zarinpal.com/pg/StartPay",
}));
