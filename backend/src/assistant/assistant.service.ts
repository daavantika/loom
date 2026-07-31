import { Injectable, Logger } from '@nestjs/common';
import { GeminiClientService } from './gemini-client.service';
import { CooksService } from '../cooks/cooks.service';
import { MenuService } from '../menu/menu.service';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  text: string;
}

const MAX_KITCHENS_IN_PROMPT = 20;
const MAX_DISHES_PER_KITCHEN = 4;
const FALLBACK_REPLY = "The assistant isn't available right now — try browsing Explore directly.";

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly gemini: GeminiClientService,
    private readonly cooks: CooksService,
    private readonly menu: MenuService,
  ) {}

  async chat(history: AssistantMessage[]): Promise<string> {
    if (!this.gemini.isConfigured()) return FALLBACK_REPLY;

    try {
      const systemPrompt = await this.buildSystemPrompt();
      const reply = await this.gemini.generateReply(
        systemPrompt,
        history.map((m) => ({ role: m.role === 'assistant' ? ('model' as const) : ('user' as const), text: m.text })),
      );
      return reply;
    } catch (err) {
      this.logger.error(`Assistant chat failed: ${(err as Error).message}`);
      return FALLBACK_REPLY;
    }
  }

  /**
   * Grounds the assistant in real catalog data so it can only ever recommend
   * kitchens/dishes that actually exist — never invent one. Same
   * accepted-at-this-scale N+1 (one menu fetch per kitchen) as the
   * frontend's own lib/catalog.ts.
   */
  private async buildSystemPrompt(): Promise<string> {
    const kitchens = (await this.cooks.searchPublic({ verifiedOnly: true })).slice(0, MAX_KITCHENS_IN_PROMPT);

    const catalogLines = await Promise.all(
      kitchens.map(async (kitchen) => {
        const dishes = await this.menu.listActiveForCook(kitchen.id);
        const dishList = dishes
          .slice(0, MAX_DISHES_PER_KITCHEN)
          .map((d) => `${d.name} (₹${Math.round(d.pricePaise / 100)})`)
          .join(', ');
        return `- ${kitchen.kitchenName ?? 'Unnamed kitchen'} (${kitchen.area ?? 'area unknown'})${kitchen.bio ? ` — ${kitchen.bio}` : ''}${dishList ? `. Dishes: ${dishList}` : '. No dishes listed yet.'}`;
      }),
    );

    const catalogText = catalogLines.length > 0 ? catalogLines.join('\n') : 'No verified kitchens are currently listed.';

    return [
      "You are LOOM's food-ordering assistant — LOOM is a marketplace for home cooks, bakers, tiffin providers, and caterers in Coimbatore.",
      'Help customers find a kitchen or dish for what they need: a one-off meal, weekday tiffins, festival food, or catering for an event.',
      '',
      'Here is the CURRENT real catalog of verified kitchens and their dishes — this is the ONLY data you may recommend from:',
      catalogText,
      '',
      'Rules: only recommend kitchens/dishes listed above, never invent one. If nothing in the catalog fits what the customer wants, say so honestly and suggest they browse Explore. Keep replies short and conversational.',
    ].join('\n');
  }
}
