import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    let hexKey: string;
    if (typeof this.config.get === 'function' && this.config.get<string>('LLM_ENCRYPTION_KEY')) {
      hexKey = this.config.get<string>('LLM_ENCRYPTION_KEY')!;
    } else {
      hexKey = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  encrypt(plaintext: string): string {
    // 12 bytes IV standard NIST per AES-GCM
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    let ivHex: string;
    let tagHex: string;
    let encHex: string;

    if (parts.length === 4 && parts[0] === 'v1') {
      [, ivHex, tagHex, encHex] = parts;
    } else if (parts.length === 3) {
      // Formato legacy retrocompatibile
      [ivHex, tagHex, encHex] = parts;
    } else {
      throw new Error('Payload criptato malformato');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    return (
      decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') +
      decipher.final('utf8')
    );
  }
}
