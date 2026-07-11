import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsTemplate, SmsEvent } from './entities/sms-template.entity';
import {
  SmsMessage,
  SmsMessageStatus,
  SmsMessageType,
} from './entities/sms-message.entity';
import {
  CreateSmsTemplateDto,
  UpdateSmsTemplateDto,
} from './dto/sms.dto';
import { paginated } from '../../common/dto/paginated-result';

interface KavenegarLookupResponse {
  return?: { status?: number; message?: string };
  entries?: Array<{ messageid?: number; status?: number; statustext?: string }>;
}

interface DispatchResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  simulated?: boolean;
}

export interface SendOptions {
  userId?: string;
  templateId?: string;
  campaignId?: string;
  type: SmsMessageType;
}

/**
 * سرویس پیامک کاوه‌نگار. OTP از سرویس Lookup استفاده می‌کند؛ پیامک‌های تراکنشی و
 * تبلیغاتی از سرویس send (خط ارسال اختصاصی SMS_SENDER). اگر کلید/خط تنظیم نشده
 * باشد، پیامک شبیه‌سازی و لاگ می‌شود (محیط توسعه بدون خط).
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SmsTemplate)
    private readonly templateRepo: Repository<SmsTemplate>,
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
  ) {}

  // ---------------------------------------------------------------------------
  // ارسال سطح‌پایین
  // ---------------------------------------------------------------------------

  /** ارسال کد تأیید (OTP) با سرویس Lookup کاوه‌نگار. */
  async sendOtp(phone: string, code: string): Promise<void> {
    const apiKey = this.configService.get<string>('app.smsApiKey');
    const template = this.configService.get<string>('app.smsTemplate');

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

    const body = (await response
      .json()
      .catch(() => ({}))) as KavenegarLookupResponse;
    const status = body?.return?.status;

    if (!response.ok || status !== 200) {
      this.logger.error(
        `Kavenegar lookup failed for ${phone}: status=${status} message=${body?.return?.message}`,
      );
      throw new Error('Failed to send verification SMS');
    }

    this.logger.log(
      `OTP SMS sent to ${phone} (messageid=${body?.entries?.[0]?.messageid})`,
    );
  }

  /** ارسال یک پیامک متن‌آزاد از طریق سرویس send کاوه‌نگار (یا شبیه‌سازی). */
  private async dispatch(phone: string, message: string): Promise<DispatchResult> {
    const apiKey = this.configService.get<string>('app.smsApiKey');
    const sender = this.configService.get<string>('app.smsSender');

    if (!apiKey || !sender) {
      this.logger.warn(
        `SMS simulated (SMS_API_KEY/SMS_SENDER missing) → ${phone}: ${message}`,
      );
      return { ok: true, simulated: true, providerMessageId: 'simulated' };
    }

    const url =
      `https://api.kavenegar.com/v1/${apiKey}/sms/send.json` +
      `?receptor=${encodeURIComponent(phone)}` +
      `&sender=${encodeURIComponent(sender)}` +
      `&message=${encodeURIComponent(message)}`;

    try {
      const response = await fetch(url, { method: 'GET' });
      const body = (await response
        .json()
        .catch(() => ({}))) as KavenegarLookupResponse;
      const status = body?.return?.status;
      if (!response.ok || status !== 200) {
        return {
          ok: false,
          error: `status=${status} message=${body?.return?.message}`,
        };
      }
      return {
        ok: true,
        providerMessageId: String(body?.entries?.[0]?.messageid ?? ''),
      };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  /** ارسال یک پیامک و ثبت لاگ آن. */
  async sendMessage(
    phone: string,
    message: string,
    opts: SendOptions,
  ): Promise<SmsMessage> {
    const result = await this.dispatch(phone, message);
    const log = this.messageRepo.create({
      userId: opts.userId,
      phone,
      body: message,
      templateId: opts.templateId,
      campaignId: opts.campaignId,
      type: opts.type,
      status: result.ok ? SmsMessageStatus.SENT : SmsMessageStatus.FAILED,
      providerMessageId: result.providerMessageId,
      error: result.error,
    });
    return this.messageRepo.save(log);
  }

  /** ارسال گروهی (برای کمپین)؛ هر پیام جداگانه لاگ می‌شود. خروجی: تعداد موفق/ناموفق. */
  async sendBulk(
    items: { phone: string; message: string; userId?: string }[],
    opts: Omit<SendOptions, 'userId'>,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    // دسته‌های کوچک برای جلوگیری از فشار هم‌زمان
    const chunkSize = 50;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map((it) =>
          this.sendMessage(it.phone, it.message, {
            ...opts,
            userId: it.userId,
          }),
        ),
      );
      for (const r of results) {
        if (r.status === SmsMessageStatus.SENT) sent++;
        else failed++;
      }
    }
    return { sent, failed };
  }

  /** جایگزینی placeholderهای متن قالب با مقادیر واقعی. */
  renderTemplate(body: string, vars: Record<string, string | undefined>): string {
    return body.replace(/\{(\w+)\}/g, (_m, key: string) => vars[key] ?? '');
  }

  // ---------------------------------------------------------------------------
  // مدیریت قالب‌ها
  // ---------------------------------------------------------------------------

  findTemplates() {
    return this.templateRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findTemplate(id: string): Promise<SmsTemplate> {
    const t = await this.templateRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('قالب پیامک یافت نشد');
    return t;
  }

  /** قالب فعالِ متناظر با یک رویداد (برای تریگرهای تراکنشی). */
  findActiveTemplate(event: SmsEvent, orderStatus?: string) {
    const qb = this.templateRepo
      .createQueryBuilder('t')
      .where('t.event = :event', { event })
      .andWhere('t.isActive = true');
    if (event === SmsEvent.ORDER_STATUS) {
      qb.andWhere('(t.orderStatus = :st OR t.orderStatus IS NULL)', {
        st: orderStatus,
      }).orderBy('t.orderStatus', 'ASC', 'NULLS LAST'); // قالب دقیق مقدم بر عمومی
    }
    return qb.getOne();
  }

  createTemplate(dto: CreateSmsTemplateDto) {
    return this.templateRepo.save(this.templateRepo.create(dto));
  }

  async updateTemplate(id: string, dto: UpdateSmsTemplateDto) {
    await this.findTemplate(id);
    await this.templateRepo.update(id, dto);
    return this.findTemplate(id);
  }

  async removeTemplate(id: string): Promise<void> {
    await this.findTemplate(id);
    await this.templateRepo.delete(id);
  }

  /** ارسال آزمایشی یک قالب به یک شماره. */
  async sendTest(templateId: string, phone: string): Promise<SmsMessage> {
    const template = await this.findTemplate(templateId);
    const message = this.renderTemplate(template.body, {
      name: 'کاربر نمونه',
      pet: 'میو',
      orderNumber: 'PL-000-0000',
      status: 'نمونه',
      amount: '۱۰۰٬۰۰۰',
    });
    return this.sendMessage(phone, message, {
      templateId,
      type: SmsMessageType.TRANSACTIONAL,
    });
  }

  // ---------------------------------------------------------------------------
  // آمار و لاگ
  // ---------------------------------------------------------------------------

  async getStats() {
    const total = await this.messageRepo.count();
    const sent = await this.messageRepo.count({
      where: { status: SmsMessageStatus.SENT },
    });
    const failed = await this.messageRepo.count({
      where: { status: SmsMessageStatus.FAILED },
    });
    const byType = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('m.type')
      .getRawMany<{ type: string; count: string }>();
    const typeBreakdown: Record<string, number> = {};
    for (const r of byType) typeBreakdown[r.type] = Number(r.count);
    return {
      totalSent: sent,
      totalFailed: failed,
      total,
      successRate: total ? Math.round((sent / total) * 100) : 0,
      typeBreakdown,
    };
  }

  async getMessages(page = 1, limit = 20) {
    const [items, total] = await this.messageRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });
    return paginated(items, total, page, limit);
  }
}
