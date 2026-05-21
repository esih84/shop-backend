import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/collection.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @Public()
  findAll() {
    return this.collectionsService.findAll();
  }

  @Get(':slug')
  @Public()
  findOne(@Param('slug') slug: string) {
    return this.collectionsService.findBySlug(slug);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCollectionDto>) {
    return this.collectionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string) {
    return this.collectionsService.remove(id);
  }
}
