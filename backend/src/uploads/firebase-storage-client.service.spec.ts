import { ConfigService } from '@nestjs/config';
import { FirebaseStorageClientService } from './firebase-storage-client.service';

const save = jest.fn().mockResolvedValue(undefined);
const file = jest.fn(() => ({ save, bucket: { name: 'test-bucket.firebasestorage.app' }, name: 'uploads/abc.jpg' }));
const bucket = jest.fn(() => ({ file, name: 'test-bucket.firebasestorage.app' }));

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
  initializeApp: jest.fn(() => ({})),
  cert: jest.fn((sa: unknown) => sa),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({ bucket })),
  getDownloadURL: jest.fn(
    async (f: { bucket: { name: string }; name: string }) =>
      `https://firebasestorage.googleapis.com/v0/b/${f.bucket.name}/o/${encodeURIComponent(f.name)}?alt=media&token=mock-token`,
  ),
}));

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const validB64 = Buffer.from(JSON.stringify({ project_id: 'p', client_email: 'e', private_key: 'k' })).toString('base64');

describe('FirebaseStorageClientService.isConfigured', () => {
  it('is false when neither var is set', () => {
    expect(new FirebaseStorageClientService(makeConfig({})).isConfigured()).toBe(false);
  });

  it('is false when only the bucket name is set', () => {
    expect(new FirebaseStorageClientService(makeConfig({ FIREBASE_STORAGE_BUCKET: 'b' })).isConfigured()).toBe(false);
  });

  it('is true once both vars are set', () => {
    expect(
      new FirebaseStorageClientService(makeConfig({ FIREBASE_STORAGE_BUCKET: 'b', FIREBASE_SERVICE_ACCOUNT_B64: validB64 })).isConfigured(),
    ).toBe(true);
  });
});

describe('FirebaseStorageClientService.upload', () => {
  it('throws instead of touching the SDK when not configured', async () => {
    const svc = new FirebaseStorageClientService(makeConfig({}));
    await expect(svc.upload('uploads/x.jpg', Buffer.from('a'), 'image/jpeg')).rejects.toThrow(/not configured/);
  });

  it('saves the buffer with contentType + a download token, and returns a firebasestorage.googleapis.com URL', async () => {
    const svc = new FirebaseStorageClientService(
      makeConfig({ FIREBASE_STORAGE_BUCKET: 'test-bucket.firebasestorage.app', FIREBASE_SERVICE_ACCOUNT_B64: validB64 }),
    );
    const url = await svc.upload('uploads/abc.jpg', Buffer.from('bytes'), 'image/jpeg');

    expect(save).toHaveBeenCalledWith(
      Buffer.from('bytes'),
      expect.objectContaining({ metadata: expect.objectContaining({ contentType: 'image/jpeg' }) }),
    );
    expect(url).toBe('https://firebasestorage.googleapis.com/v0/b/test-bucket.firebasestorage.app/o/uploads%2Fabc.jpg?alt=media&token=mock-token');
  });
});
