import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  findAll(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    const count = await this.addressRepository.count({ where: { userId } });
    // اولین آدرس همیشه پیش‌فرض می‌شود
    const isDefault = count === 0 ? true : (dto.isDefault ?? false);
    if (isDefault && count > 0) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    const address = this.addressRepository.create({
      ...dto,
      userId,
      isDefault,
    });
    return this.addressRepository.save(address);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.findOne(userId, id);
    if (dto.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    Object.assign(address, dto);
    return this.addressRepository.save(address);
  }

  async setDefault(userId: string, id: string): Promise<Address> {
    const address = await this.findOne(userId, id);
    await this.addressRepository.update({ userId }, { isDefault: false });
    address.isDefault = true;
    return this.addressRepository.save(address);
  }

  async remove(userId: string, id: string): Promise<void> {
    const address = await this.findOne(userId, id);
    await this.addressRepository.remove(address);
    // اگر آدرس پیش‌فرض حذف شد، جدیدترین آدرس باقی‌مانده پیش‌فرض می‌شود
    if (address.isDefault) {
      const next = await this.addressRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (next) {
        next.isDefault = true;
        await this.addressRepository.save(next);
      }
    }
  }
}
