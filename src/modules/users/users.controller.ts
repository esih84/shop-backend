import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { User } from './entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users (admin)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination.page ?? 1, pagination.limit ?? 20);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
