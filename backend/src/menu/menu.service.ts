import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MenuItem } from './menu-item.entity';
import { SaveMenuItemDto } from './dto/save-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(@InjectRepository(MenuItem, 'userDb') private readonly items: Repository<MenuItem>) {}

  /** Cook's own view — includes inactive items. */
  listForCook(cookId: string): Promise<MenuItem[]> {
    return this.items.find({ where: { cookId }, order: { createdAt: 'ASC' } });
  }

  /** Public catalog view — active items only. */
  listActiveForCook(cookId: string): Promise<MenuItem[]> {
    return this.items.find({ where: { cookId, active: true }, order: { createdAt: 'ASC' } });
  }

  create(cookId: string, dto: SaveMenuItemDto): Promise<MenuItem> {
    return this.items.save(
      this.items.create({
        cookId,
        name: dto.name,
        description: dto.description,
        pricePaise: dto.pricePaise,
        imageUrl: dto.imageUrl,
        tags: dto.tags ?? [],
        isTodaysSpecial: dto.isTodaysSpecial ?? false,
        specialPortionsLeft: dto.specialPortionsLeft,
        caloriesKcal: dto.caloriesKcal,
        proteinG: dto.proteinG,
        fatG: dto.fatG,
        carbsG: dto.carbsG,
        fibreG: dto.fibreG,
      }),
    );
  }

  private async getOwned(cookId: string, itemId: string): Promise<MenuItem> {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item || item.cookId !== cookId) {
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  async update(cookId: string, itemId: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.getOwned(cookId, itemId);
    if (dto.name !== undefined) item.name = dto.name;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.pricePaise !== undefined) item.pricePaise = dto.pricePaise;
    if (dto.imageUrl !== undefined) item.imageUrl = dto.imageUrl;
    if (dto.tags !== undefined) item.tags = dto.tags;
    if (dto.active !== undefined) item.active = dto.active;
    if (dto.isTodaysSpecial !== undefined) item.isTodaysSpecial = dto.isTodaysSpecial;
    if (dto.specialPortionsLeft !== undefined) item.specialPortionsLeft = dto.specialPortionsLeft;
    if (dto.caloriesKcal !== undefined) item.caloriesKcal = dto.caloriesKcal;
    if (dto.proteinG !== undefined) item.proteinG = dto.proteinG;
    if (dto.fatG !== undefined) item.fatG = dto.fatG;
    if (dto.carbsG !== undefined) item.carbsG = dto.carbsG;
    if (dto.fibreG !== undefined) item.fibreG = dto.fibreG;
    return this.items.save(item);
  }

  async delete(cookId: string, itemId: string): Promise<void> {
    await this.getOwned(cookId, itemId);
    await this.items.delete({ id: itemId });
  }

  /**
   * Used by OrdersService.create — every requested id must belong to this
   * cook and be currently active, or the whole order is rejected (400) with
   * no order created. One query, then a set-difference against the request.
   */
  async getOrderableItems(cookId: string, menuItemIds: string[]): Promise<MenuItem[]> {
    const found = await this.items.find({ where: { id: In(menuItemIds), cookId, active: true } });
    const foundIds = new Set(found.map((i) => i.id));
    const missing = menuItemIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `The following menu items are unavailable, inactive, or don't belong to this cook: ${missing.join(', ')}`,
      );
    }
    return found;
  }
}
