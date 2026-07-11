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
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { imageFileValidationPipe } from '../upload/image-file.validation';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all brands' })
  findAll() {
    return this.brandsService.findAll();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get brand by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.brandsService.findBySlug(slug);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create brand (admin) — با آپلود تصویر' })
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  create(
    @Body() dto: CreateBrandDto,
    @UploadedFile(imageFileValidationPipe) image?: Express.Multer.File,
  ) {
    return this.brandsService.create(dto, image);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update brand (admin) — با آپلود تصویر' })
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  update(
    @Param('id') id: string,
    @Body() dto: CreateBrandDto,
    @UploadedFile(imageFileValidationPipe) image?: Express.Multer.File,
  ) {
    return this.brandsService.update(id, dto, image);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete brand (admin)' })
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }
}
