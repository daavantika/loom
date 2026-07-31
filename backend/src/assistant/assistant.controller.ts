import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto/chat.dto';

// Public — same openness as the public catalog endpoints, since this only
// ever touches public catalog data, never anything personal.
@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    const reply = await this.assistant.chat(dto.messages);
    return { reply };
  }
}
