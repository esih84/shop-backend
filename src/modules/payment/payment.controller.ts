import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { User } from "../users/entities/user.entity";
import { CreateOrderDto } from "../orders/dto/order.dto";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentService } from "./payment.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * چک‌اوت یک‌مرحله‌ای: در یک درخواست سفارش را از روی سبد می‌سازد، تراکنش پرداخت
   * را ایجاد می‌کند و آدرس درگاه را برمی‌گرداند.
   */
  @Post()
  @ApiOperation({ summary: "Create order from cart and start payment" })
  checkout(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.paymentService.checkout(user, dto);
  }

  /** تلاش مجدد پرداخت برای یک سفارشِ موجودِ در انتظار پرداخت. */
  @Post("retry")
  @ApiOperation({ summary: "Start a new payment for an existing pending order" })
  retry(@CurrentUser() user: User, @Body() dto: CreatePaymentDto) {
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
