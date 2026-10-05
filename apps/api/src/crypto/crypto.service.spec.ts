import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoService } from './crypto.service.js';
import { ConfigService } from '@nestjs/config';

describe('CryptoService', () => {
  let service: CryptoService;
  // 64-char hex key (32 bytes)
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    const configService = {
      getOrThrow: (key: string) => {
        if (key === 'ENCRYPTION_KEY') return testKey;
        throw new Error(`Unknown key ${key}`);
      },
    } as unknown as ConfigService;

    service = new CryptoService(configService);
  });

  it('should encrypt and decrypt string accurately', () => {
    const secret = 'sk-ant-api-key-very-secret-12345';
    const encrypted = service.encrypt(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should fail when decrypting tampered payload', () => {
    const secret = 'super-secret';
    const encrypted = service.encrypt(secret);
    const parts = encrypted.split(':');
    parts[2] = 'deadbeef' + parts[2].slice(8); // alter ciphertext

    expect(() => service.decrypt(parts.join(':'))).toThrow();
  });
});
