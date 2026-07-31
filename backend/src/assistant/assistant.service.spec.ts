import { AssistantService } from './assistant.service';
import { GeminiClientService } from './gemini-client.service';
import { CooksService } from '../cooks/cooks.service';
import { MenuService } from '../menu/menu.service';

const KITCHEN = { id: 'cook-1', kitchenName: 'Meera’s Kitchen', area: 'RS Puram', bio: 'Home-style Chettinad food' };
const DISH = { id: 'item-1', name: 'Lemon rice box', pricePaise: 9000 };

function makeService(
  overrides: Partial<{ gemini: any; cooks: any; menu: any }> = {},
) {
  const gemini =
    overrides.gemini ??
    ({
      isConfigured: jest.fn(() => true),
      generateReply: jest.fn(async () => 'Try Meera’s Kitchen for lunch!'),
    } as unknown as GeminiClientService);
  const cooks = overrides.cooks ?? ({ searchPublic: jest.fn(async () => [KITCHEN]) } as unknown as CooksService);
  const menu = overrides.menu ?? ({ listActiveForCook: jest.fn(async () => [DISH]) } as unknown as MenuService);
  const service = new AssistantService(gemini, cooks, menu);
  return { service, gemini, cooks, menu };
}

describe('AssistantService.chat', () => {
  it('returns a static fallback without calling Gemini or the catalog when not configured', async () => {
    const { service, gemini, cooks } = makeService({ gemini: { isConfigured: () => false, generateReply: jest.fn() } });

    const reply = await service.chat([{ role: 'user', text: 'Suggest lunch' }]);

    expect(reply).toMatch(/isn't available/i);
    expect(gemini.generateReply).not.toHaveBeenCalled();
    expect(cooks.searchPublic).not.toHaveBeenCalled();
  });

  it('grounds the system prompt in real catalog data and maps assistant history to Gemini\'s "model" role', async () => {
    const { service, gemini, cooks, menu } = makeService();

    const reply = await service.chat([
      { role: 'user', text: 'Suggest lunch' },
      { role: 'assistant', text: 'How about something light?' },
    ]);

    expect(reply).toBe('Try Meera’s Kitchen for lunch!');
    expect(cooks.searchPublic).toHaveBeenCalledWith({ verifiedOnly: true });
    expect(menu.listActiveForCook).toHaveBeenCalledWith('cook-1');

    const [systemPrompt, messages] = gemini.generateReply.mock.calls[0];
    expect(systemPrompt).toContain('Meera’s Kitchen');
    expect(systemPrompt).toContain('Lemon rice box (₹90)');
    expect(systemPrompt).toContain('only recommend');
    expect(messages).toEqual([
      { role: 'user', text: 'Suggest lunch' },
      { role: 'model', text: 'How about something light?' },
    ]);
  });

  it('tells the assistant honestly when the catalog is empty, rather than letting it invent a kitchen', async () => {
    const { service, gemini } = makeService({ cooks: { searchPublic: jest.fn(async () => []) } });

    await service.chat([{ role: 'user', text: 'Suggest lunch' }]);

    const [systemPrompt] = gemini.generateReply.mock.calls[0];
    expect(systemPrompt).toContain('No verified kitchens are currently listed');
  });

  it('falls back gracefully (never throws) when the Gemini call itself fails', async () => {
    const { service } = makeService({ gemini: { isConfigured: () => true, generateReply: jest.fn().mockRejectedValue(new Error('rate limited')) } });

    const reply = await service.chat([{ role: 'user', text: 'Suggest lunch' }]);

    expect(reply).toMatch(/isn't available/i);
  });
});
