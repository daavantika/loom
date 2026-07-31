import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CustomersService } from './customers.service';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { SaveAddressDto } from './dto/save-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

interface AuthedRequest {
  user: { userId: string; role: string };
}

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('me')
  getMe(@Req() req: AuthedRequest) {
    return this.customers.getOrCreateProfile(req.user.userId);
  }

  @Patch('me')
  updateMe(@Req() req: AuthedRequest, @Body() dto: UpdateCustomerProfileDto) {
    return this.customers.updateProfile(req.user.userId, dto);
  }

  @Get('me/addresses')
  listAddresses(@Req() req: AuthedRequest) {
    return this.customers.listAddresses(req.user.userId);
  }

  @Post('me/addresses')
  addAddress(@Req() req: AuthedRequest, @Body() dto: SaveAddressDto) {
    return this.customers.addAddress(req.user.userId, dto);
  }

  @Patch('me/addresses/:id')
  updateAddress(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.customers.updateAddress(req.user.userId, id, dto);
  }

  @Delete('me/addresses/:id')
  @HttpCode(204)
  async deleteAddress(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.customers.deleteAddress(req.user.userId, id);
  }

  @Get('me/favorites')
  listFavorites(@Req() req: AuthedRequest) {
    return this.customers.listFavorites(req.user.userId);
  }

  @Put('me/favorites/:cookId')
  @HttpCode(204)
  async addFavorite(@Req() req: AuthedRequest, @Param('cookId') cookId: string) {
    await this.customers.addFavorite(req.user.userId, cookId);
  }

  @Delete('me/favorites/:cookId')
  @HttpCode(204)
  async removeFavorite(@Req() req: AuthedRequest, @Param('cookId') cookId: string) {
    await this.customers.removeFavorite(req.user.userId, cookId);
  }
}
