import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsController } from './pets.controller';
import { PetsAdminController } from './pets-admin.controller';
import { PetsService } from './pets.service';
import { Pet } from './entities/pet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pet])],
  controllers: [PetsController, PetsAdminController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
