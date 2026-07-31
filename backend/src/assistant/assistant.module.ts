import { Module } from '@nestjs/common';
import { GeminiClientService } from './gemini-client.service';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { CooksModule } from '../cooks/cooks.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [CooksModule, MenuModule],
  providers: [GeminiClientService, AssistantService],
  controllers: [AssistantController],
})
export class AssistantModule {}
