import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VerifyPaymentDto } from '../payments/dto/verify-payment.dto';

interface AuthedRequest {
  user: { userId: string; role: string };
}

@ApiTags('orders')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  @Roles('CUSTOMER')
  create(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
    return this.orders.create(req.user.userId, dto);
  }

  @Get('orders/mine')
  @Roles('CUSTOMER')
  listMine(@Req() req: AuthedRequest) {
    return this.orders.listMine(req.user.userId);
  }

  // COOK and CUSTOMER both accepted — every self-registered account is
  // CUSTOMER-role (see CooksController), a verified cook's JWT still says
  // so, and OrdersService resolves cook-vs-customer perspective by actual
  // profile ownership, not by this role claim.
  @Get('cooks/me/orders')
  @Roles('COOK', 'CUSTOMER')
  listForCook(@Req() req: AuthedRequest) {
    return this.orders.listForCook(req.user.userId);
  }

  @Get('orders/:id')
  @Roles('CUSTOMER', 'COOK')
  getById(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.orders.getById(req.user.userId, id);
  }

  @Patch('orders/:id/status')
  @Roles('CUSTOMER', 'COOK')
  updateStatus(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(req.user.userId, id, dto);
  }

  // CUSTOMER and COOK both accepted for the same reason as every other route
  // here (ownership-checked in the service, not role-gated) — in practice
  // only the paying customer can ever pass OrdersService.verifyPayment's
  // perspective check.
  @Post('orders/:id/verify-payment')
  @Roles('CUSTOMER', 'COOK')
  verifyPayment(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: VerifyPaymentDto) {
    return this.orders.verifyPayment(req.user.userId, id, dto);
  }
}
