import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { imageFileValidationPipe } from '../upload/image-file.validation';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all categories as tree' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get category by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create category (admin) — با آپلود تصویر' })
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile(imageFileValidationPipe) image?: Express.Multer.File,
  ) {
    return this.categoriesService.create(dto, image);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update category (admin) — با آپلود تصویر' })
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  update(
    @Param('id') id: string,
    @Body() dto: CreateCategoryDto,
    @UploadedFile(imageFileValidationPipe) image?: Express.Multer.File,
  ) {
    return this.categoriesService.update(id, dto, image);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete category (admin)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
