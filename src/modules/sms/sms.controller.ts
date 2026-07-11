import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { SmsCampaignsService } from './sms-campaigns.service';
import {
  CreateSmsTemplateDto,
  UpdateSmsTemplateDto,
  SendTestSmsDto,
  CreateCampaignDto,
  PreviewCampaignDto,
} from './dto/sms.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('sms')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN)
@Controller('sms')
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly campaignsService: SmsCampaignsService,
  ) {}

  // ---- قالب‌ها ----
  @Get('templates')
  @ApiOperation({ summary: 'لیست قالب‌های پیامک (admin)' })
  listTemplates() {
    return this.smsService.findTemplates();
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.smsService.findTemplate(id);
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateSmsTemplateDto) {
    return this.smsService.createTemplate(dto);
  }

  @Put('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateSmsTemplateDto) {
    return this.smsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string) {
    return this.smsService.removeTemplate(id);
  }

  @Post('send-test')
  @ApiOperation({ summary: 'ارسال آزمایشی یک قالب به یک شماره (admin)' })
  sendTest(@Body() dto: SendTestSmsDto) {
    return this.smsService.sendTest(dto.templateId, dto.phone);
  }

  // ---- آمار/لاگ ----
  @Get('stats')
  getStats() {
    return this.smsService.getStats();
  }

  @Get('messages')
  getMessages(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.smsService.getMessages(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // ---- کمپین‌ها ----
  @Get('campaigns')
  listCampaigns(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.campaignsService.list(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post('campaigns/preview')
  @ApiOperation({ summary: 'پیش‌نمایش تعداد گیرنده‌ی کمپین (admin)' })
  previewCampaign(@Body() dto: PreviewCampaignDto) {
    return this.campaignsService.preview(dto);
  }

  @Get('campaigns/:id')
  getCampaign(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post('campaigns')
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Post('campaigns/:id/send')
  @ApiOperation({ summary: 'ارسال کمپین به گیرنده‌ها (admin)' })
  sendCampaign(@Param('id') id: string) {
    return this.campaignsService.send(id);
  }
}
