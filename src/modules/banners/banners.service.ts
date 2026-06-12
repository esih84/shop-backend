import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, In } from "typeorm";
import { Banner } from "./entities/banner.entity";
import { CreateBannerDto } from "./dto/banner.dto";

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
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

  async create(dto: CreateBannerDto): Promise<Banner> {
    return this.bannerRepository.save(this.bannerRepository.create(dto));
  }

  async update(id: string, dto: Partial<CreateBannerDto>): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) throw new NotFoundException("Banner not found");
    await this.bannerRepository.update(id, dto);
    return { ...banner, ...dto } as Banner;
  }

  async remove(id: string): Promise<void> {
    await this.bannerRepository.delete(id);
  }
}
