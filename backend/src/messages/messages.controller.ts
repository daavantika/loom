import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

interface AuthedRequest {
  user: { userId: string; role: string };
}

// Every route below accepts both COOK and CUSTOMER: a user's `role` is fixed
// at registration and a verified cook's JWT still says CUSTOMER (see
// CooksController) — real scoping is "your own customer/cook profile",
// resolved per request, not the role claim.
@ApiTags('messages')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // NB: cooks/me/conversations must stay registered before cooks/:cookId/messages
  // below — same route-ordering gotcha as CooksController's cooks/me/menu.
  @Get('cooks/me/conversations')
  @Roles('COOK', 'CUSTOMER')
  async listConversations(@Req() req: AuthedRequest) {
    const cookId = await this.messages.resolveOwnCookId(req.user.userId);
    return this.messages.listConversationsForCook(cookId);
  }

  @Get('cooks/me/conversations/:customerId/messages')
  @Roles('COOK', 'CUSTOMER')
  async getCookThread(@Req() req: AuthedRequest, @Param('customerId') customerId: string) {
    const cookId = await this.messages.resolveOwnCookId(req.user.userId);
    const thread = await this.messages.listThread(cookId, customerId);
    await this.messages.markRead(cookId, customerId, 'COOK');
    return thread;
  }

  @Post('cooks/me/conversations/:customerId/messages')
  @Roles('COOK', 'CUSTOMER')
  async replyAsCook(@Req() req: AuthedRequest, @Param('customerId') customerId: string, @Body() dto: SendMessageDto) {
    const cookId = await this.messages.resolveOwnCookId(req.user.userId);
    return this.messages.sendMessage(cookId, customerId, 'COOK', dto.body);
  }

  @Get('cooks/:cookId/messages')
  @Roles('CUSTOMER', 'COOK')
  async getCustomerThread(@Req() req: AuthedRequest, @Param('cookId') cookId: string) {
    await this.messages.assertCookIsMessageable(cookId);
    const customerId = await this.messages.resolveOwnCustomerId(req.user.userId);
    const thread = await this.messages.listThread(cookId, customerId);
    await this.messages.markRead(cookId, customerId, 'CUSTOMER');
    return thread;
  }

  @Post('cooks/:cookId/messages')
  @Roles('CUSTOMER', 'COOK')
  async sendAsCustomer(@Req() req: AuthedRequest, @Param('cookId') cookId: string, @Body() dto: SendMessageDto) {
    await this.messages.assertCookIsMessageable(cookId);
    const customerId = await this.messages.resolveOwnCustomerId(req.user.userId);
    return this.messages.sendMessage(cookId, customerId, 'CUSTOMER', dto.body);
  }
}
