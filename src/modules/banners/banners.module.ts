import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { Banner } from './entities/banner.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Banner]), UploadModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
