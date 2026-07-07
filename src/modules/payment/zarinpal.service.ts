import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface ZarinpalRequestResponse {
  data?: { code?: number; authority?: string; message?: string } | null;
  errors?: unknown;
}

interface ZarinpalVerifyResponse {
  data?: { code?: number; ref_id?: number; message?: string } | null;
  errors?: unknown;
}

/**
 * ارتباط با REST API زرین‌پال (sandbox) با fetch بومی — مطابق الگوی SmsService.
 * مبلغ در ورودی به «تومان» است و هنگام ارسال به ریال تبدیل می‌شود.
 */
@Injectable()
export class ZarinpalService {
  private readonly logger = new Logger(ZarinpalService.name);

  constructor(private readonly config: ConfigService) {}

  private get merchantId(): string {
    return this.config.get<string>("zarinpal.merchantId") ?? "";
  }

  async request(params: {
    amount: number;
    description: string;
    callbackUrl: string;
    mobile?: string;
    email?: string;
  }): Promise<{ authority: string; gatewayUrl: string }> {
    const requestUrl = this.config.get<string>("zarinpal.requestUrl")!;
    const gatewayUrl = this.config.get<string>("zarinpal.gatewayUrl")!;

    const body = {
      merchant_id: this.merchantId,
      amount: Math.round(params.amount * 10), // تومان → ریال
      description: params.description,
      callback_url: params.callbackUrl,
      metadata: { mobile: params.mobile ?? "", email: params.email ?? "" },
    };

    let res: Response;
    try {
      res = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`Zarinpal request failed: ${(err as Error).message}`);
      throw new BadRequestException("ارتباط با درگاه پرداخت برقرار نشد");
    }

    const json = (await res
      .json()
      .catch(() => ({}))) as ZarinpalRequestResponse;
    const code = json.data?.code;
    const authority = json.data?.authority;

    if (code === 100 && authority) {
      return { authority, gatewayUrl: `${gatewayUrl}/${authority}` };
    }

    this.logger.error(
      `Zarinpal request rejected: code=${code} errors=${JSON.stringify(json.errors)}`,
    );
    throw new BadRequestException("ایجاد تراکنش پرداخت ناموفق بود");
  }

  async verify(params: {
    authority: string;
    amount: number;
  }): Promise<{ ok: boolean; refId?: string; code?: number }> {
    const verifyUrl = this.config.get<string>("zarinpal.verifyUrl")!;

    const body = {
      merchant_id: this.merchantId,
      amount: Math.round(params.amount * 10), // تومان → ریال
      authority: params.authority,
    };

    let res: Response;
    try {
      res = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`Zarinpal verify failed: ${(err as Error).message}`);
      return { ok: false };
    }

    const json = (await res.json().catch(() => ({}))) as ZarinpalVerifyResponse;
    const code = json.data?.code;
    // 100 = موفق، 101 = قبلاً تأیید شده
    const ok = code === 100 || code === 101;
    const refId = json.data?.ref_id != null ? String(json.data.ref_id) : undefined;
    return { ok, refId, code };
  }
}
