import { ConfigService } from '@nestjs/config';
import { GeminiClientService } from './gemini-client.service';

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, statusText: 'status', json: async () => body } as Response;
}

describe('GeminiClientService.isConfigured', () => {
  it('is false with no key set', () => {
    const svc = new GeminiClientService(makeConfig({}));
    expect(svc.isConfigured()).toBe(false);
  });

  it('is true once GEMINI_API_KEY is set', () => {
    const svc = new GeminiClientService(makeConfig({ GEMINI_API_KEY: 'test-key' }));
    expect(svc.isConfigured()).toBe(true);
  });
});

describe('GeminiClientService.generateReply', () => {
  it('throws immediately when not configured, without calling fetch', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const svc = new GeminiClientService(makeConfig({}));

    await expect(svc.generateReply('system', [])).rejects.toThrow(/not configured/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('posts the system instruction + message history in the shape Gemini expects, and returns the reply text', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ candidates: [{ content: { parts: [{ text: 'Try Meera’s Kitchen!' }] } }] }),
    );
    const svc = new GeminiClientService(makeConfig({ GEMINI_API_KEY: 'test-key' }));

    const reply = await svc.generateReply('You are a helpful assistant.', [
      { role: 'user', text: 'Suggest a lunch' },
    ]);

    expect(reply).toBe('Try Meera’s Kitchen!');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('gemini-flash-latest:generateContent?key=test-key');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.system_instruction).toEqual({ parts: [{ text: 'You are a helpful assistant.' }] });
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Suggest a lunch' }] }]);
    fetchSpy.mockRestore();
  });

  it('throws a clear error when Gemini responds with a non-OK status', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ error: { message: 'API key not valid' } }, false, 400));
    const svc = new GeminiClientService(makeConfig({ GEMINI_API_KEY: 'bad-key' }));

    await expect(svc.generateReply('system', [])).rejects.toThrow(/API key not valid/);
    fetchSpy.mockRestore();
  });

  it('throws when the response is missing the expected candidate text', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ candidates: [] }));
    const svc = new GeminiClientService(makeConfig({ GEMINI_API_KEY: 'test-key' }));

    await expect(svc.generateReply('system', [])).rejects.toThrow(/unexpected response shape/);
    fetchSpy.mockRestore();
  });
});
