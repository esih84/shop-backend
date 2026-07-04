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
import { PetsService } from './pets.service';
import { CreatePetDto, UpdatePetDto } from './dto/pet.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('pets')
@ApiBearerAuth('access-token')
@Controller('users/me/pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  @ApiOperation({ summary: 'List my pets' })
  findAll(@CurrentUser() user: User) {
    return this.petsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create pet' })
  create(@CurrentUser() user: User, @Body() dto: CreatePetDto) {
    return this.petsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pet' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePetDto,
  ) {
    return this.petsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete pet' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.petsService.remove(user.id, id);
  }
}
