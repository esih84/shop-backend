import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('crm')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('customers')
  @ApiOperation({ summary: 'لیست مشتریان با فیلدهای RFM و فیلتر سگمنت (admin)' })
  getCustomers(@Query() filter: CustomerFilterDto) {
    return this.crmService.getCustomers(filter);
  }

  @Get('segments')
  @ApiOperation({ summary: 'تعداد مشتری در هر سگمنت (admin)' })
  getSegments() {
    return this.crmService.getSegmentCounts();
  }

  @Post('recompute-rfm')
  @ApiOperation({ summary: 'بازمحاسبه‌ی گروهی امتیازها و سگمنت‌های RFM (admin)' })
  recompute() {
    return this.crmService.recomputeAll();
  }
}
