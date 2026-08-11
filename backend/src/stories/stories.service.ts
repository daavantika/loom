import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Story } from './story.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { CooksService } from '../cooks/cooks.service';

export interface PublicStory {
  id: string;
  cookId: string;
  title: string;
  body: string;
  createdAt: Date;
  kitchenName?: string;
  cookImage?: string;
}

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story, 'userDb') private readonly stories: Repository<Story>,
    private readonly cooks: CooksService,
  ) {}

  create(cookId: string, dto: CreateStoryDto): Promise<Story> {
    return this.stories.save(this.stories.create({ cookId, title: dto.title, body: dto.body }));
  }

  /** Cook's own view, newest first — used to manage/delete their posts. */
  listForCook(cookId: string): Promise<Story[]> {
    return this.stories.find({ where: { cookId }, order: { createdAt: 'DESC' } });
  }

  async delete(cookId: string, storyId: string): Promise<void> {
    const story = await this.stories.findOne({ where: { id: storyId } });
    if (!story || story.cookId !== cookId) {
      throw new NotFoundException('Story not found');
    }
    await this.stories.delete({ id: storyId });
  }

  /**
   * Public feed: only stories from verified, customer-facing kitchens —
   * same cross-DB-safe pattern as MessagesService.assertCookIsMessageable,
   * reusing CooksService.searchPublic's already-merged verification status
   * rather than joining across the user/admin DB split.
   */
  async listPublicFeed(limit = 30): Promise<PublicStory[]> {
    const verifiedCooks = await this.cooks.searchPublic({ verifiedOnly: true });
    if (verifiedCooks.length === 0) return [];

    const cookMap = new Map(verifiedCooks.map((c) => [c.id, c]));
    const rows = await this.stories.find({
      where: { cookId: In([...cookMap.keys()]) },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return rows.map((story) => {
      const cook = cookMap.get(story.cookId);
      return {
        id: story.id,
        cookId: story.cookId,
        title: story.title,
        body: story.body,
        createdAt: story.createdAt,
        kitchenName: cook?.kitchenName,
        cookImage: cook?.photos[0],
      };
    });
  }
}
