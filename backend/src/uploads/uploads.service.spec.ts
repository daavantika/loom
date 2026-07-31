import { promises as fs } from 'fs';
import { join } from 'path';
import { UploadsService } from './uploads.service';
import { SupabaseStorageClientService } from './supabase-storage-client.service';
import { UPLOADS_DIR } from './uploads.constants';

function makeRequest() {
  return {
    protocol: 'http',
    get: (header: string) => (header === 'host' ? 'localhost:3000' : undefined),
  } as any;
}

function makeSupabase(isConfigured: boolean, upload = jest.fn()): SupabaseStorageClientService {
  return { isConfigured: () => isConfigured, upload } as unknown as SupabaseStorageClientService;
}

describe('UploadsService.store — local-disk fallback (Supabase not configured)', () => {
  it('writes the buffer to UPLOADS_DIR and returns an absolute URL built from the request host', async () => {
    const service = new UploadsService(makeSupabase(false));
    const file = { originalname: 'kitchen.jpg', buffer: Buffer.from('fake-bytes'), mimetype: 'image/jpeg' } as Express.Multer.File;

    const url = await service.store(file, makeRequest());

    expect(url).toMatch(/^http:\/\/localhost:3000\/uploads\/[0-9a-f-]+\.jpg$/);
    const filename = url.split('/uploads/')[1];
    await expect(fs.readFile(join(UPLOADS_DIR, filename))).resolves.toEqual(Buffer.from('fake-bytes'));
    await fs.rm(join(UPLOADS_DIR, filename));
  });
});

describe('UploadsService.store — Supabase branch (configured)', () => {
  it('delegates to SupabaseStorageClientService.upload with an uploads/<uuid><ext> object path and the mimetype', async () => {
    const upload = jest.fn().mockResolvedValue('https://project-ref.supabase.co/storage/v1/object/public/uploads/uploads/abc.jpg');
    const service = new UploadsService(makeSupabase(true, upload));
    const file = { originalname: 'kitchen.jpg', buffer: Buffer.from('fake-bytes'), mimetype: 'image/jpeg' } as Express.Multer.File;

    const url = await service.store(file, makeRequest());

    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^uploads\/[0-9a-f-]+\.jpg$/), file.buffer, 'image/jpeg');
    expect(url).toBe('https://project-ref.supabase.co/storage/v1/object/public/uploads/uploads/abc.jpg');
  });
});
