import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ModerationService } from './moderation.service';
import { RejectVerificationDto } from './dto/reject-verification.dto';

interface AuthedRequest {
  user: { userId: string; role: string };
}

@ApiTags('admin-moderation')
@Controller('admin/moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('verifications')
  listVerifications() {
    return this.moderation.listOpenVerificationCases();
  }

  @Post('verifications/:caseId/approve')
  approve(@Param('caseId') caseId: string, @Req() req: AuthedRequest) {
    return this.moderation.approveVerification(caseId, req.user.userId);
  }

  @Post('verifications/:caseId/reject')
  reject(@Param('caseId') caseId: string, @Body() dto: RejectVerificationDto, @Req() req: AuthedRequest) {
    return this.moderation.rejectVerification(caseId, req.user.userId, dto.reason);
  }
}
