import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

function makeService(secret = 'a-sufficiently-long-test-secret'): CryptoService {
  const config = { getOrThrow: () => secret } as unknown as ConfigService;
  return new CryptoService(config);
}

describe('CryptoService', () => {
  it('round-trips plaintext through encrypt/decrypt', () => {
    const svc = makeService();
    const ciphertext = svc.encrypt('9876543210@okaxis');
    expect(svc.decrypt(ciphertext)).toBe('9876543210@okaxis');
  });

  it('produces different ciphertext for the same plaintext on each call (random IV)', () => {
    const svc = makeService();
    const a = svc.encrypt('same-value');
    const b = svc.encrypt('same-value');
    expect(a.equals(b)).toBe(false);
  });

  it('fails to decrypt if the ciphertext has been tampered with', () => {
    const svc = makeService();
    const ciphertext = svc.encrypt('sensitive-bank-details');
    ciphertext[ciphertext.length - 1] ^= 0xff;
    expect(() => svc.decrypt(ciphertext)).toThrow();
  });

  it('cannot decrypt data encrypted with a different key', () => {
    const a = makeService('secret-one-secret-one');
    const b = makeService('secret-two-secret-two');
    const ciphertext = a.encrypt('payload');
    expect(() => b.decrypt(ciphertext)).toThrow();
  });
});
