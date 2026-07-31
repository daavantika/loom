import { BadRequestException } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

function makeRequest() {
  return {
    protocol: 'http',
    get: (header: string) => (header === 'host' ? 'localhost:3000' : undefined),
  } as any;
}

function makeUploadsService(store: jest.Mock): UploadsService {
  return { store } as unknown as UploadsService;
}

describe('UploadsController.uploadFile', () => {
  it('rejects when no file was attached', async () => {
    const controller = new UploadsController(makeUploadsService(jest.fn()));
    await expect(controller.uploadFile(undefined as any, makeRequest())).rejects.toThrow(BadRequestException);
  });

  it('delegates to UploadsService.store and wraps the result in { url }', async () => {
    const store = jest.fn().mockResolvedValue('http://localhost:3000/uploads/abc123.jpg');
    const controller = new UploadsController(makeUploadsService(store));
    const file = { originalname: 'kitchen.jpg', buffer: Buffer.from('x'), mimetype: 'image/jpeg' } as Express.Multer.File;
    const req = makeRequest();

    const result = await controller.uploadFile(file, req);

    expect(store).toHaveBeenCalledWith(file, req);
    expect(result).toEqual({ url: 'http://localhost:3000/uploads/abc123.jpg' });
  });
});
