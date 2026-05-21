import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/blog.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  @Public()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.blogsService.findAll(page, limit);
  }

  @Get(':slug')
  @Public()
  findOne(@Param('slug') slug: string) {
    return this.blogsService.findBySlug(slug);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  create(@CurrentUser() user: User, @Body() dto: CreateBlogDto) {
    return this.blogsService.create(user, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  update(@Param('id') id: string, @Body() dto: Partial<CreateBlogDto>) {
    return this.blogsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string) {
    return this.blogsService.remove(id);
  }
}
