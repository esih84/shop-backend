import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "../orders/entities/order.entity";
import { Payment } from "./entities/payment.entity";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { ZarinpalService } from "./zarinpal.service";
import { CrmModule } from "../crm/crm.module";
import { SmsModule } from "../sms/sms.module";

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order]), CrmModule, SmsModule],
  controllers: [PaymentController],
  providers: [PaymentService, ZarinpalService],
  exports: [PaymentService],
})
export class PaymentModule {}
