import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { CustomersModule } from '../customers/customers.module';
import { CooksModule } from '../cooks/cooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message], 'userDb'), CustomersModule, CooksModule],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
