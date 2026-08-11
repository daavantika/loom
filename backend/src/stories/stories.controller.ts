import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { CooksService } from '../cooks/cooks.service';

interface AuthedRequest {
  user: { userId: string; role: string };
}

// Same role-claim caveat as CooksController/MessagesController: a user's
// `role` is fixed at registration, so "COOK" routes below accept both COOK
// and CUSTOMER — real scoping is the userId-resolved own cook profile.
@ApiTags('stories')
@Controller()
export class StoriesController {
  constructor(
    private readonly stories: StoriesService,
    private readonly cooks: CooksService,
  ) {}

  // NB: cooks/me/stories must stay registered before any cooks/:id route
  // that could otherwise swallow "me" as an id — same gotcha as
  // CooksController's cooks/me/menu.
  @Get('cooks/me/stories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  async listMyStories(@Req() req: AuthedRequest) {
    const profile = await this.cooks.getMyProfile(req.user.userId);
    return this.stories.listForCook(profile.id);
  }

  @Post('cooks/me/stories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  async createStory(@Req() req: AuthedRequest, @Body() dto: CreateStoryDto) {
    const profile = await this.cooks.getMyProfile(req.user.userId);
    return this.stories.create(profile.id, dto);
  }

  @Delete('cooks/me/stories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  @HttpCode(204)
  async deleteStory(@Req() req: AuthedRequest, @Param('id') id: string) {
    const profile = await this.cooks.getMyProfile(req.user.userId);
    await this.stories.delete(profile.id, id);
  }

  @Get('stories')
  listPublicFeed() {
    return this.stories.listPublicFeed();
  }
}
