import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, In } from "typeorm";
import { Banner } from "./entities/banner.entity";
import { CreateBannerDto } from "./dto/banner.dto";
import { UploadService } from "../upload/upload.service";
import { paginated } from "../../common/dto/paginated-result";

export interface BannerImageFiles {
  image?: Express.Multer.File[];
  mobileImage?: Express.Multer.File[];
}

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    private readonly uploadService: UploadService,
  ) {}

 async findActive(positions?: string[]): Promise<Banner[]> {
    const where: any = { isActive: true };

    if (positions && positions.length > 0) {
      where.position = In(positions);
    }

    return this.bannerRepository.find({
      where,
      order: {
        order: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  /** لیست همه‌ی بنرها (شامل غیرفعال) با صفحه‌بندی — پنل ادمین */
  async findAllAdmin(page = 1, limit = 20) {
    const [data, total] = await this.bannerRepository.findAndCount({
      order: { order: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(data, total, page, limit);
  }

  async create(
    dto: CreateBannerDto,
    files?: BannerImageFiles,
  ): Promise<Banner> {
    const banner = this.bannerRepository.create(dto);

    const imageFile = files?.image?.[0];
    if (imageFile) {
      const urls = await this.uploadService.uploadImage(imageFile, "banners");
      banner.imageUrl = urls.large;
    }

    const mobileFile = files?.mobileImage?.[0];
    if (mobileFile) {
      const urls = await this.uploadService.uploadImage(mobileFile, "banners");
      banner.mobileImageUrl = urls.large;
    }

    if (!banner.imageUrl) {
      throw new BadRequestException(
        "تصویر بنر الزامی است: فایل image را آپلود کنید یا imageUrl را ارسال کنید.",
      );
    }

    return this.bannerRepository.save(banner);
  }

  async update(
    id: string,
    dto: Partial<CreateBannerDto>,
    files?: BannerImageFiles,
  ): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) throw new NotFoundException("Banner not found");

    const imageFile = files?.image?.[0];
    if (imageFile) {
      const urls = await this.uploadService.uploadImage(imageFile, "banners");
      dto.imageUrl = urls.large;
    }

    const mobileFile = files?.mobileImage?.[0];
    if (mobileFile) {
      const urls = await this.uploadService.uploadImage(mobileFile, "banners");
      dto.mobileImageUrl = urls.large;
    }

    await this.bannerRepository.update(id, dto);
    return { ...banner, ...dto } as Banner;
  }

  async remove(id: string): Promise<void> {
    await this.bannerRepository.delete(id);
  }
}
