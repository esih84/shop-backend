import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cart } from "./entities/cart.entity";
import { CartItem } from "./entities/cart-item.entity";
import { Product } from "../products/entities/product.entity";
import { Discount } from "../products/entities/discount.entity";
import { computeEffectivePrice } from "../products/product-pricing.util";
import { AddCartItemDto, UpdateCartItemDto } from "./dto/cart.dto";
import { User } from "../users/entities/user.entity";

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /** با تغییر اقلام سبد، کوپن اعمال‌شده باطل می‌شود تا مبلغ ذخیره‌شده کهنه نماند. */
  private async invalidateCoupon(cartId: string): Promise<void> {
    await this.cartRepository.update(cartId, {
      couponCode: null,
      discountAmount: 0,
    });
  }

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: {
        items: {
          product: { images: true, discounts: true },
        },
      },
    });

    if (!cart) {
      cart = await this.cartRepository.save(
        this.cartRepository.create({
          userId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }),
      );
    }

    // قیمت مؤثر با تخفیف محصول را روی هر آیتم می‌گذاریم تا فرانت قیمت درست را نشان دهد.
    for (const item of cart.items ?? []) {
      if (!item.product) continue;
      const { price, activeDiscount } = computeEffectivePrice(
        Number(item.product.basePrice),
        item.product.discounts,
      );
      (item.product as Product & { discountedPrice: number }).discountedPrice =
        price;
      (
        item.product as Product & { activeDiscount: Discount | null }
      ).activeDiscount = activeDiscount;
    }
    return cart;
  }

  async addItem(user: User, dto: AddCartItemDto): Promise<Cart> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId, isActive: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    if (product.stock < dto.quantity) {
      throw new BadRequestException(`Only ${product.stock} items in stock`);
    }

    const cart = await this.getOrCreateCart(user.id);

    const existingItem = cart.items?.find((i) => i.productId === dto.productId);
    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (product.stock < newQty) {
        throw new BadRequestException(`Only ${product.stock} items in stock`);
      }
      await this.cartItemRepository.update(existingItem.id, {
        quantity: newQty,
      });
    } else {
      await this.cartItemRepository.save(
        this.cartItemRepository.create({ cartId: cart.id, ...dto }),
      );
    }

    await this.invalidateCoupon(cart.id);
    return this.getOrCreateCart(user.id);
  }

  async updateItem(
    user: User,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(user.id);
    const item = cart.items?.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Cart item not found");

    const product = await this.productRepository.findOne({
      where: { id: item.productId },
    });
    if (product && product.stock < dto.quantity) {
      throw new BadRequestException(`Only ${product.stock} items in stock`);
    }

    await this.cartItemRepository.update(itemId, { quantity: dto.quantity });
    await this.invalidateCoupon(cart.id);
    return this.getOrCreateCart(user.id);
  }

  async removeItem(user: User, itemId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(user.id);
    const item = cart.items?.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Cart item not found");
    await this.cartItemRepository.remove(item);
    await this.invalidateCoupon(cart.id);
    return this.getOrCreateCart(user.id);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: { items: true },
    });
    if (cart?.items?.length) {
      await this.cartItemRepository.remove(cart.items);
    }
  }
}
