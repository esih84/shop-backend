import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BannersService } from "./banners.service";
import { CreateBannerDto } from "./dto/banner.dto";
import { Roles, Role } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";

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
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
  }

  @Put(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  update(@Param("id") id: string, @Body() dto: Partial<CreateBannerDto>) {
    return this.bannersService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  remove(@Param("id") id: string) {
    return this.bannersService.remove(id);
  }
}
