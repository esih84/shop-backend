import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('addresses')
@ApiBearerAuth('access-token')
@Controller('users/me/addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List my addresses' })
  findAll(@CurrentUser() user: User) {
    return this.addressesService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create address' })
  create(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  setDefault(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.addressesService.setDefault(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.addressesService.remove(user.id, id);
  }
}
