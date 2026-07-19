import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "../orders/entities/order.entity";
import { Payment } from "./entities/payment.entity";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { ZarinpalService } from "./zarinpal.service";
import { CrmModule } from "../crm/crm.module";
import { SmsModule } from "../sms/sms.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
    CrmModule,
    SmsModule,
    OrdersModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, ZarinpalService],
  exports: [PaymentService],
})
export class PaymentModule {}
