import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerProfile } from './customer-profile.entity';
import { CustomerAddress } from './customer-address.entity';
import { CustomerFavorite } from './customer-favorite.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CooksModule } from '../cooks/cooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerProfile, CustomerAddress, CustomerFavorite], 'userDb'),
    CooksModule,
  ],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
