import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { User } from "../users/entities/user.entity";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentService } from "./payment.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** ساخت تراکنش برای سفارش و برگرداندن آدرس درگاه زرین‌پال. */
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreatePaymentDto) {
    return this.paymentService.createForOrder(user, dto.orderId);
  }

  /**
   * callback زرین‌پال: مرورگر کاربر بدون کوکی احراز هویت به اینجا برمی‌گردد،
   * پس باید @Public باشد. پس از تأیید، کاربر به صفحه‌ی نتیجه‌ی فروشگاه redirect می‌شود.
   */
  @Public()
  @Get("verify")
  async verify(
    @Query("Authority") authority: string,
    @Query("Status") status: string,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.paymentService.verify(authority ?? "", status ?? "");
    res.redirect(url);
  }
}
