import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { paginated } from '../../common/dto/paginated-result';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findById(id);
    await this.userRepository.update(id, dto);
    return this.findById(id);
  }

  async findAll(page: number, limit: number) {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return paginated(users, total, page, limit);
  }

  async deactivate(id: string): Promise<void> {
    await this.findById(id);
    await this.userRepository.update(id, { isActive: false });
  }
}
