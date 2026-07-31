import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomerProfile } from './customer-profile.entity';
import { CustomerAddress } from './customer-address.entity';
import { CustomerFavorite } from './customer-favorite.entity';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { SaveAddressDto } from './dto/save-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CooksService, PublicCookProfile } from '../cooks/cooks.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerProfile, 'userDb') private readonly profiles: Repository<CustomerProfile>,
    @InjectRepository(CustomerAddress, 'userDb') private readonly addresses: Repository<CustomerAddress>,
    @InjectRepository(CustomerFavorite, 'userDb') private readonly favorites: Repository<CustomerFavorite>,
    @InjectDataSource('userDb') private readonly dataSource: DataSource,
    private readonly cooks: CooksService,
  ) {}

  async getOrCreateProfile(userId: string): Promise<CustomerProfile> {
    let profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      profile = await this.profiles.save(this.profiles.create({ userId }));
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto): Promise<CustomerProfile> {
    const profile = await this.getOrCreateProfile(userId);
    if (dto.displayName !== undefined) profile.displayName = dto.displayName;
    if (dto.dietaryPreference !== undefined) profile.dietaryPreference = dto.dietaryPreference;
    if (dto.spiceLevel !== undefined) profile.spiceLevel = dto.spiceLevel;
    return this.profiles.save(profile);
  }

  async listAddresses(userId: string): Promise<CustomerAddress[]> {
    const profile = await this.getOrCreateProfile(userId);
    return this.addresses.find({ where: { customerId: profile.id }, order: { createdAt: 'ASC' } });
  }

  async addAddress(userId: string, dto: SaveAddressDto): Promise<CustomerAddress> {
    const profile = await this.getOrCreateProfile(userId);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.withRepository(this.addresses);
      if (dto.isDefault) {
        await repo.update({ customerId: profile.id }, { isDefault: false });
      }
      return repo.save(
        repo.create({
          customerId: profile.id,
          label: dto.label,
          addressLine: dto.addressLine,
          area: dto.area,
          lat: dto.lat,
          lng: dto.lng,
          isDefault: dto.isDefault ?? false,
        }),
      );
    });
  }

  /** Public: also used by OrdersService to validate+snapshot the chosen delivery address at order time. */
  async getOwnedAddress(userId: string, addressId: string): Promise<CustomerAddress> {
    const profile = await this.getOrCreateProfile(userId);
    const address = await this.addresses.findOne({ where: { id: addressId } });
    if (!address || address.customerId !== profile.id) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<CustomerAddress> {
    const address = await this.getOwnedAddress(userId, addressId);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.withRepository(this.addresses);
      if (dto.isDefault) {
        await repo.update({ customerId: address.customerId }, { isDefault: false });
      }
      if (dto.label !== undefined) address.label = dto.label;
      if (dto.addressLine !== undefined) address.addressLine = dto.addressLine;
      if (dto.area !== undefined) address.area = dto.area;
      if (dto.lat !== undefined) address.lat = dto.lat;
      if (dto.lng !== undefined) address.lng = dto.lng;
      if (dto.isDefault !== undefined) address.isDefault = dto.isDefault;
      return repo.save(address);
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.getOwnedAddress(userId, addressId);
    await this.addresses.delete({ id: address.id });
  }

  async listFavorites(userId: string): Promise<PublicCookProfile[]> {
    const profile = await this.getOrCreateProfile(userId);
    const rows = await this.favorites.find({ where: { customerId: profile.id } });
    return this.cooks.getPublicProfilesByIds(rows.map((r) => r.cookId));
  }

  /** Idempotent: favoriting an already-favorited cook is a no-op, not an error. 404 only if the cook doesn't exist at all. */
  async addFavorite(userId: string, cookId: string): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    try {
      await this.cooks.getPublicProfile(cookId);
    } catch {
      throw new NotFoundException('Cook not found');
    }
    await this.favorites
      .createQueryBuilder()
      .insert()
      .values({ customerId: profile.id, cookId })
      .orIgnore()
      .execute();
  }

  /** Idempotent: 204 whether or not the favorite existed — deleting a nonexistent row is a no-op. */
  async removeFavorite(userId: string, cookId: string): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    await this.favorites.delete({ customerId: profile.id, cookId });
  }
}
