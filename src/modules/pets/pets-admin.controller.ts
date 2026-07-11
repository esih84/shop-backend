import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PetsService } from './pets.service';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('pets')
@ApiBearerAuth('access-token')
@Controller('pets')
export class PetsAdminController {
  constructor(private readonly petsService: PetsService) {}

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all pets with their owner (admin)' })
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.petsService.findAllAdmin(Number(page), Number(limit));
  }
}
