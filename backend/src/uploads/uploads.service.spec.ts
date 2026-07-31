import { promises as fs } from 'fs';
import { join } from 'path';
import { UploadsService } from './uploads.service';
import { FirebaseStorageClientService } from './firebase-storage-client.service';
import { UPLOADS_DIR } from './uploads.constants';

function makeRequest() {
  return {
    protocol: 'http',
    get: (header: string) => (header === 'host' ? 'localhost:3000' : undefined),
  } as any;
}

function makeFirebase(isConfigured: boolean, upload = jest.fn()): FirebaseStorageClientService {
  return { isConfigured: () => isConfigured, upload } as unknown as FirebaseStorageClientService;
}

describe('UploadsService.store — local-disk fallback (Firebase not configured)', () => {
  it('writes the buffer to UPLOADS_DIR and returns an absolute URL built from the request host', async () => {
    const service = new UploadsService(makeFirebase(false));
    const file = { originalname: 'kitchen.jpg', buffer: Buffer.from('fake-bytes'), mimetype: 'image/jpeg' } as Express.Multer.File;

    const url = await service.store(file, makeRequest());

    expect(url).toMatch(/^http:\/\/localhost:3000\/uploads\/[0-9a-f-]+\.jpg$/);
    const filename = url.split('/uploads/')[1];
    await expect(fs.readFile(join(UPLOADS_DIR, filename))).resolves.toEqual(Buffer.from('fake-bytes'));
    await fs.rm(join(UPLOADS_DIR, filename));
  });
});

describe('UploadsService.store — Firebase branch (configured)', () => {
  it('delegates to FirebaseStorageClientService.upload with an uploads/<uuid><ext> object path and the mimetype', async () => {
    const upload = jest.fn().mockResolvedValue('https://firebasestorage.googleapis.com/v0/b/x/o/uploads%2Fabc.jpg?alt=media&token=t');
    const service = new UploadsService(makeFirebase(true, upload));
    const file = { originalname: 'kitchen.jpg', buffer: Buffer.from('fake-bytes'), mimetype: 'image/jpeg' } as Express.Multer.File;

    const url = await service.store(file, makeRequest());

    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^uploads\/[0-9a-f-]+\.jpg$/), file.buffer, 'image/jpeg');
    expect(url).toBe('https://firebasestorage.googleapis.com/v0/b/x/o/uploads%2Fabc.jpg?alt=media&token=t');
  });
});
