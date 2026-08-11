import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story } from './story.entity';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { CooksModule } from '../cooks/cooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Story], 'userDb'), CooksModule],
  providers: [StoriesService],
  controllers: [StoriesController],
  exports: [StoriesService],
})
export class StoriesModule {}
