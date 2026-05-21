import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LoyaltyTier } from '../modules/loyalty/entities/loyalty-tier.entity';
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../common/decorators/roles.decorator';
import * as bcrypt from 'bcrypt';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get<DataSource>(getDataSourceToken());

  // Seed loyalty tiers
  const tierRepo = dataSource.getRepository(LoyaltyTier);
  const tiersCount = await tierRepo.count();
  if (tiersCount === 0) {
    await tierRepo.save([
      { name: 'Bronze', slug: 'bronze', minPoints: 0, minSpent: 0, discountPercentage: 0, benefits: {} },
      { name: 'Silver', slug: 'silver', minPoints: 500, minSpent: 500000, discountPercentage: 3, freeShippingThreshold: 300000 },
      { name: 'Gold', slug: 'gold', minPoints: 2000, minSpent: 2000000, discountPercentage: 5, freeShippingThreshold: 200000 },
      { name: 'Platinum', slug: 'platinum', minPoints: 10000, minSpent: 10000000, discountPercentage: 10, freeShippingThreshold: 0 },
    ]);
    console.log('✔ Loyalty tiers seeded');
  }

  // Seed admin user
  const userRepo = dataSource.getRepository(User);
  const adminExists = await userRepo.findOne({ where: { phone: '09000000000' } });
  if (!adminExists) {
    await userRepo.save({
      phone: '09000000000',
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isActive: true,
      referralCode: 'ADMIN0000',
    });
    console.log('✔ Admin user seeded (phone: 09000000000)');
  }

  await app.close();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
