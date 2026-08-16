import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CooksService, toPublicCookProfile } from './cooks.service';
import { SaveOnboardingDto } from './dto/save-onboarding.dto';
import { SubmitVerificationDto } from '../verification/dto/submit-verification.dto';
import { MenuService } from '../menu/menu.service';
import { SaveMenuItemDto } from '../menu/dto/save-menu-item.dto';
import { UpdateMenuItemDto } from '../menu/dto/update-menu-item.dto';

interface AuthedRequest {
  user: { userId: string; role: string };
}

// Every self-service route below accepts both COOK and CUSTOMER: a user's
// `role` is fixed at registration and there's no role-change endpoint, but
// "start selling" is meant to be reachable from an existing customer account
// (per the product flow) — real access control is the userId-scoped
// ownership check in each service method, not the role label.
@ApiTags('cooks')
@Controller()
export class CooksController {
  constructor(
    private readonly cooks: CooksService,
    private readonly menu: MenuService,
  ) {}

  @Post('cooks/onboarding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  saveOnboarding(@Req() req: AuthedRequest, @Body() dto: SaveOnboardingDto) {
    return this.cooks.saveOnboarding(req.user.userId, dto);
  }

  @Post('cooks/onboarding/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  submit(@Req() req: AuthedRequest, @Body() dto: SubmitVerificationDto) {
    return this.cooks.submitVerification(req.user.userId, dto);
  }

  @Get('cooks/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  async getMe(@Req() req: AuthedRequest) {
    const { profile, verification } = await this.cooks.getMyProfileWithStatus(req.user.userId);
    return {
      ...profile,
      verified: verification.verified,
      verificationStatus: verification.status,
      rejectionReason: verification.rejectionReason,
    };
  }

  // NB: these /cooks/me/menu routes must stay registered before /cooks/:id
  // and /cooks/:id/menu below — Nest/Express matches routes in registration
  // order, so a later `:id` route would otherwise swallow "me" as an id.
  @Get('cooks/me/menu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  async listMyMenu(@Req() req: AuthedRequest) {
    const profile = await this.cooks.getMyProfile(req.user.userId);
    return this.menu.listForCook(profile.id);
  }

  @Post('cooks/me/menu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  async createMenuItem(@Req() req: AuthedRequest, @Body() dto: SaveMenuItemDto) {
    const profile = await this.cooks.getMyProfile(req.user.userId);
    return this.menu.create(profile.id, dto);
  }

  @Patch('cooks/me/menu/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  async updateMenuItem(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    const profile = await this.cooks.getMyProfile(req.user.userId);
    return this.menu.update(profile.id, id, dto);
  }

  @Delete('cooks/me/menu/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOK', 'CUSTOMER')
  @ApiBearerAuth()
  @HttpCode(204)
  async deleteMenuItem(@Req() req: AuthedRequest, @Param('id') id: string) {
    const profile = await this.cooks.getMyProfile(req.user.userId);
    await this.menu.delete(profile.id, id);
  }

  @Get('cooks')
  searchPublic(@Query('area') area?: string, @Query('verifiedOnly') verifiedOnly?: string) {
    return this.cooks.searchPublic({ area, verifiedOnly: verifiedOnly === 'true' });
  }

  @Get('admin/cooks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  listAllForAdmin() {
    return this.cooks.listAllForAdmin();
  }

  @Get('cooks/:id')
  async getPublicProfile(@Param('id') id: string) {
    const { profile, verification } = await this.cooks.getPublicProfile(id);
    return toPublicCookProfile(profile, verification);
  }

  @Get('cooks/:id/menu')
  getPublicMenu(@Param('id') id: string) {
    return this.menu.listActiveForCook(id);
  }
}
