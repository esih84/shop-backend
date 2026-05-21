import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('referrals')
@ApiBearerAuth('access-token')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  getReferrals(@CurrentUser() user: User) {
    return this.referralsService.getReferrals(user.id);
  }
}
