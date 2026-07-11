import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsService } from './sms.service';
import { SmsNotificationsService } from './sms-notifications.service';
import { SmsCampaignsService } from './sms-campaigns.service';
import { SmsController } from './sms.controller';
import { SmsTemplate } from './entities/sms-template.entity';
import { SmsMessage } from './entities/sms-message.entity';
import { SmsCampaign } from './entities/sms-campaign.entity';
import { Order } from '../orders/entities/order.entity';
import { Pet } from '../pets/entities/pet.entity';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmsTemplate, SmsMessage, SmsCampaign, Order, Pet]),
    CrmModule,
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsNotificationsService, SmsCampaignsService],
  exports: [SmsService, SmsNotificationsService],
})
export class SmsModule {}
