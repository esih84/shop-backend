import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './entities/pet.entity';
import { CreatePetDto, UpdatePetDto } from './dto/pet.dto';
import { paginated } from '../../common/dto/paginated-result';

@Injectable()
export class PetsService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  findAll(userId: string): Promise<Pet[]> {
    return this.petRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** لیست همه‌ی حیوانات خانگی همراه با صاحبشان (ادمین). */
  async findAllAdmin(page = 1, limit = 20) {
    const [pets, total] = await this.petRepository.findAndCount({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(pets, total, page, limit);
  }

  async findOne(userId: string, id: string): Promise<Pet> {
    const pet = await this.petRepository.findOne({ where: { id, userId } });
    if (!pet) throw new NotFoundException('Pet not found');
    return pet;
  }

  create(userId: string, dto: CreatePetDto): Promise<Pet> {
    const pet = this.petRepository.create({ ...dto, userId });
    return this.petRepository.save(pet);
  }

  async update(userId: string, id: string, dto: UpdatePetDto): Promise<Pet> {
    const pet = await this.findOne(userId, id);
    Object.assign(pet, dto);
    return this.petRepository.save(pet);
  }

  async remove(userId: string, id: string): Promise<void> {
    const pet = await this.findOne(userId, id);
    await this.petRepository.remove(pet);
  }

  /** اگر پتی با این نام برای کاربر نبود، می‌سازد (برای ثبت سفارش). */
  async ensureByName(userId: string, name: string): Promise<Pet> {
    const trimmed = name.trim();
    const existing = await this.petRepository
      .createQueryBuilder('pet')
      .where('pet.user_id = :userId', { userId })
      .andWhere('LOWER(pet.name) = LOWER(:name)', { name: trimmed })
      .getOne();
    if (existing) return existing;
    return this.create(userId, { name: trimmed });
  }
}
