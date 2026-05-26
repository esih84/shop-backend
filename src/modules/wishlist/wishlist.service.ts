import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Wishlist } from "./entities/wishlist.entity";

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async getWishlist(userId: string) {
    return this.wishlistRepository.find({
      where: { userId },
      relations: {
        product: {
          images: true, // This handles the nested relation 'product.images'
        },
        variant: true,
      },
      order: { addedAt: "DESC" },
    });
  }

  async addItem(
    userId: string,
    productId: string,
    variantId?: string,
  ): Promise<Wishlist> {
    const exists = await this.wishlistRepository.findOne({
      where: { userId, productId, ...(variantId ? { variantId } : {}) },
    });
    if (exists) throw new ConflictException("Item already in wishlist");

    return this.wishlistRepository.save(
      this.wishlistRepository.create({ userId, productId, variantId }),
    );
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    const item = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });
    if (!item) throw new NotFoundException("Item not in wishlist");
    await this.wishlistRepository.remove(item);
  }
}
