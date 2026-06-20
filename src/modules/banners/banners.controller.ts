import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ApiBearerAuth, ApiTags, ApiConsumes } from "@nestjs/swagger";
import { BannersService } from "./banners.service";
import type { BannerImageFiles } from "./banners.service";
import { CreateBannerDto } from "./dto/banner.dto";
import { Roles, Role } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";

const bannerImageFields = FileFieldsInterceptor(
  [
    { name: "image", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ],
  { storage: memoryStorage() },
);

@ApiTags("banners")
@Controller("banners")
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @Public()
  findAll(@Query("position") positions?: string) {
    const positionsArray = positions
      ? positions.split(",").map((p) => p.trim())
      : undefined;
    return this.bannersService.findActive(positionsArray);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiConsumes("multipart/form-data", "application/json")
  @UseInterceptors(bannerImageFields)
  create(
    @Body() dto: CreateBannerDto,
    @UploadedFiles() files?: BannerImageFiles,
  ) {
    return this.bannersService.create(dto, files);
  }

  @Put(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiConsumes("multipart/form-data", "application/json")
  @UseInterceptors(bannerImageFields)
  update(
    @Param("id") id: string,
    @Body() dto: Partial<CreateBannerDto>,
    @UploadedFiles() files?: BannerImageFiles,
  ) {
    return this.bannersService.update(id, dto, files);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  remove(@Param("id") id: string) {
    return this.bannersService.remove(id);
  }
}
