import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class CreatePaymentDto {
  @ApiProperty({ description: "شناسه‌ی سفارشی که باید پرداخت شود" })
  @IsUUID()
  orderId: string;
}
