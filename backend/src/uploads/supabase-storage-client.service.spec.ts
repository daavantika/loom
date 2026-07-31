import { ConfigService } from '@nestjs/config';
import { SupabaseStorageClientService } from './supabase-storage-client.service';

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, statusText: 'status', json: async () => body } as Response;
}

const CONFIGURED = {
  SUPABASE_URL: 'https://project-ref.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  SUPABASE_STORAGE_BUCKET: 'uploads',
};

describe('SupabaseStorageClientService.isConfigured', () => {
  it('is false when none of the vars are set', () => {
    expect(new SupabaseStorageClientService(makeConfig({})).isConfigured()).toBe(false);
  });

  it('is false when only some of the three vars are set', () => {
    expect(new SupabaseStorageClientService(makeConfig({ SUPABASE_URL: CONFIGURED.SUPABASE_URL })).isConfigured()).toBe(false);
    expect(
      new SupabaseStorageClientService(
        makeConfig({ SUPABASE_URL: CONFIGURED.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: CONFIGURED.SUPABASE_SERVICE_ROLE_KEY }),
      ).isConfigured(),
    ).toBe(false);
  });

  it('is true once all three vars are set', () => {
    expect(new SupabaseStorageClientService(makeConfig(CONFIGURED)).isConfigured()).toBe(true);
  });
});

describe('SupabaseStorageClientService.upload', () => {
  it('throws immediately when not configured, without calling fetch', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const svc = new SupabaseStorageClientService(makeConfig({}));

    await expect(svc.upload('uploads/x.jpg', Buffer.from('a'), 'image/jpeg')).rejects.toThrow(/not configured/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('POSTs the buffer with the right headers, and returns the public URL', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ Key: 'uploads/abc.jpg' }));
    const svc = new SupabaseStorageClientService(makeConfig(CONFIGURED));

    const url = await svc.upload('uploads/abc.jpg', Buffer.from('bytes'), 'image/jpeg');

    expect(url).toBe('https://project-ref.supabase.co/storage/v1/object/public/uploads/uploads/abc.jpg');
    const [reqUrl, init] = fetchSpy.mock.calls[0];
    expect(String(reqUrl)).toBe('https://project-ref.supabase.co/storage/v1/object/uploads/uploads/abc.jpg');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.apikey).toBe('service-role-key');
    expect(headers.Authorization).toBe('Bearer service-role-key');
    expect(headers['Content-Type']).toBe('image/jpeg');
    expect((init as RequestInit).body).toEqual(Buffer.from('bytes'));
    fetchSpy.mockRestore();
  });

  it('throws a clear error when Supabase responds with a non-OK status', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ message: 'Bucket not found' }, false, 404));
    const svc = new SupabaseStorageClientService(makeConfig(CONFIGURED));

    await expect(svc.upload('uploads/x.jpg', Buffer.from('a'), 'image/jpeg')).rejects.toThrow(/Bucket not found/);
    fetchSpy.mockRestore();
  });
});
