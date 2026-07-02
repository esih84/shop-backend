import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface KavenegarLookupResponse {
  return?: { status?: number; message?: string };
  entries?: Array<{ messageid?: number; status?: number; statustext?: string }>;
}

/**
 * سرویس پیامک مبتنی بر «کاوه‌نگار».
 * برای ارسال کد یک‌بارمصرف از سرویس Lookup (verify) استفاده می‌کند:
 * https://kavenegar.com/rest.html#sms-Lookup
 * قالب (template) باید از قبل در پنل کاوه‌نگار تعریف و تأیید شده باشد.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  /** ارسال کد تأیید (OTP) با سرویس Lookup کاوه‌نگار. */
  async sendOtp(phone: string, code: string): Promise<void> {
    const apiKey = this.configService.get<string>('app.smsApiKey');
    const template = this.configService.get<string>('app.smsTemplate');

    // اگر تنظیمات پیامک کامل نباشد (مثلاً محیط توسعه)، فقط لاگ می‌کنیم و
    // بدون خطا برمی‌گردیم تا جریان احراز هویت مختل نشود.
    if (!apiKey || !template) {
      this.logger.warn(
        `SMS not configured (SMS_API_KEY/SMS_TEMPLATE missing). OTP for ${phone}: ${code}`,
      );
      return;
    }

    const url =
      `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json` +
      `?receptor=${encodeURIComponent(phone)}` +
      `&token=${encodeURIComponent(code)}` +
      `&template=${encodeURIComponent(template)}`;

    let response: Response;
    try {
      response = await fetch(url, { method: 'GET' });
    } catch (err) {
      this.logger.error(
        `Kavenegar request failed for ${phone}: ${(err as Error).message}`,
      );
      throw new Error('SMS provider request failed');
    }

    const body = (await response.json().catch(() => ({}))) as KavenegarLookupResponse;
    const status = body?.return?.status;

    if (!response.ok || status !== 200) {
      this.logger.error(
        `Kavenegar lookup failed for ${phone}: status=${status} message=${body?.return?.message}`,
      );
      throw new Error('Failed to send verification SMS');
    }

    this.logger.log(`OTP SMS sent to ${phone} (messageid=${body?.entries?.[0]?.messageid})`);
  }
}
