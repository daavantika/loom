import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Message, MessageSenderRole } from './message.entity';
import { CustomersService } from '../customers/customers.service';
import { CooksService } from '../cooks/cooks.service';

export interface ConversationSummary {
  customerId: string;
  customerName: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

const OTHER_ROLE: Record<MessageSenderRole, MessageSenderRole> = { COOK: 'CUSTOMER', CUSTOMER: 'COOK' };

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message, 'userDb') private readonly messages: Repository<Message>,
    private readonly customers: CustomersService,
    private readonly cooks: CooksService,
  ) {}

  /** A general cook<->customer inbox thread, not scoped to any one order — same shape the chat entry points (kitchen profile, an order) already share. */
  async listThread(cookId: string, customerId: string): Promise<Message[]> {
    return this.messages.find({ where: { cookId, customerId }, order: { createdAt: 'ASC' } });
  }

  async sendMessage(cookId: string, customerId: string, senderRole: MessageSenderRole, body: string): Promise<Message> {
    return this.messages.save(this.messages.create({ cookId, customerId, senderRole, body }));
  }

  /** Opening a thread marks the OTHER party's messages read — simple, no separate "mark read" action needed in the UI. */
  async markRead(cookId: string, customerId: string, readerRole: MessageSenderRole): Promise<void> {
    await this.messages.update(
      { cookId, customerId, senderRole: OTHER_ROLE[readerRole], readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  async listConversationsForCook(cookId: string): Promise<ConversationSummary[]> {
    const rows = await this.messages
      .createQueryBuilder('m')
      .innerJoin('m.customer', 'cp')
      .innerJoin('cp.user', 'u')
      .select('m.customerId', 'customerId')
      .addSelect('MAX(COALESCE("cp"."display_name", "u"."email"))', 'customerName')
      .addSelect('MAX("m"."created_at")', 'lastMessageAt')
      .addSelect('(array_agg("m"."body" ORDER BY "m"."created_at" DESC))[1]', 'lastMessage')
      .addSelect(`COUNT(*) FILTER (WHERE "m"."sender_role" = 'CUSTOMER' AND "m"."read_at" IS NULL)`, 'unreadCount')
      .where('m.cookId = :cookId', { cookId })
      .groupBy('m.customerId')
      .getRawMany();

    return rows
      .map((r) => ({
        customerId: r.customerId as string,
        customerName: r.customerName as string,
        lastMessage: r.lastMessage as string,
        lastMessageAt: r.lastMessageAt as Date,
        unreadCount: Number(r.unreadCount),
      }))
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  /** Shared guard for the customer-facing routes — you can only message a kitchen that's actually customer-facing (verified), same rule OrdersService.create applies before letting a customer order from a cook. getPublicProfile itself 404s if the cook doesn't exist at all. */
  async assertCookIsMessageable(cookId: string): Promise<void> {
    const { verification } = await this.cooks.getPublicProfile(cookId);
    if (!verification.verified) {
      throw new BadRequestException('This kitchen is not currently accepting messages');
    }
  }

  async resolveOwnCustomerId(userId: string): Promise<string> {
    const profile = await this.customers.getOrCreateProfile(userId);
    return profile.id;
  }

  async resolveOwnCookId(userId: string): Promise<string> {
    const profile = await this.cooks.getMyProfile(userId);
    return profile.id;
  }
}
