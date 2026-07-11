import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SmsCampaign,
  SmsCampaignStatus,
} from './entities/sms-campaign.entity';
import { SmsMessageType } from './entities/sms-message.entity';
import { SmsService } from './sms.service';
import { CrmService } from '../crm/crm.service';
import { CreateCampaignDto, PreviewCampaignDto } from './dto/sms.dto';
import { CustomerFilterDto } from '../crm/dto/customer-filter.dto';
import { paginated } from '../../common/dto/paginated-result';

@Injectable()
export class SmsCampaignsService {
  constructor(
    @InjectRepository(SmsCampaign)
    private readonly campaignRepo: Repository<SmsCampaign>,
    private readonly smsService: SmsService,
    private readonly crmService: CrmService,
  ) {}

  list(page = 1, limit = 20) {
    return this.campaignRepo
      .findAndCount({
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 100),
      })
      .then(([items, total]) => paginated(items, total, page, limit));
  }

  async findOne(id: string): Promise<SmsCampaign> {
    const c = await this.campaignRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('کمپین یافت نشد');
    return c;
  }

  create(dto: CreateCampaignDto) {
    return this.campaignRepo.save(
      this.campaignRepo.create({
        name: dto.name,
        body: dto.body,
        filters: dto.filters as Record<string, unknown> | undefined,
        status: SmsCampaignStatus.DRAFT,
      }),
    );
  }

  /** پیش‌نمایش گیرنده‌ها: تعداد + چند نمونه (بدون ارسال). */
  async preview(dto: PreviewCampaignDto) {
    const recipients = await this.crmService.resolveRecipients(
      (dto.filters ?? {}) as CustomerFilterDto,
    );
    return {
      count: recipients.length,
      sample: recipients.slice(0, 5).map((r) => ({
        name: [r.firstName, r.lastName].filter(Boolean).join(' '),
        phone: r.phone,
        pet: r.petName,
      })),
    };
  }

  /** ارسال کمپین به همه‌ی گیرنده‌های واجد شرایط با متن شخصی‌سازی‌شده. */
  async send(id: string): Promise<SmsCampaign> {
    const campaign = await this.findOne(id);
    const recipients = await this.crmService.resolveRecipients(
      (campaign.filters ?? {}) as CustomerFilterDto,
    );

    campaign.status = SmsCampaignStatus.SENDING;
    campaign.totalRecipients = recipients.length;
    await this.campaignRepo.save(campaign);

    const items = recipients.map((r) => ({
      phone: r.phone,
      userId: r.id,
      message: this.smsService.renderTemplate(campaign.body, {
        name: r.firstName ?? '',
        pet: r.petName ?? '',
      }),
    }));

    const { sent, failed } = await this.smsService.sendBulk(items, {
      campaignId: campaign.id,
      type: SmsMessageType.PROMOTIONAL,
    });

    campaign.sentCount = sent;
    campaign.failedCount = failed;
    campaign.sentAt = new Date();
    campaign.status = failed && !sent
      ? SmsCampaignStatus.FAILED
      : SmsCampaignStatus.SENT;
    return this.campaignRepo.save(campaign);
  }
}
