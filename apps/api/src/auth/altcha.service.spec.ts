import { describe, it, expect, beforeEach } from 'vitest';
import { AltchaService } from './altcha.service.js';
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

describe('AltchaService (PoW & Crypto Verification)', () => {
  let altchaService: AltchaService;

  const mockConfigService = {
    get: (key: string) => {
      if (key === 'ALTCHA_HMAC_KEY') return 'test_altcha_hmac_secret_key_1234567890';
      return null;
    },
  };

  beforeEach(() => {
    altchaService = new AltchaService(mockConfigService as any);
  });

  it('dovrebbe generare una sfida ALTCHA valida e firmata', () => {
    const challenge = altchaService.generateChallenge(100);
    expect(challenge.algorithm).toBe('SHA-256');
    expect(challenge.maxnumber).toBe(100);
    expect(challenge.salt).toBeDefined();
    expect(challenge.challenge).toHaveLength(64);
    expect(challenge.signature).toHaveLength(64);
  });

  it('dovrebbe risolvere e verificare con successo una sfida valida', () => {
    // Usiamo una difficoltà ridotta per velocità del test unitario
    const maxNumber = 1000;
    const challenge = altchaService.generateChallenge(maxNumber);

    // Risolutore PoW
    let solvedNumber = -1;
    for (let n = 0; n <= maxNumber; n++) {
      const hash = createHash('sha256').update(challenge.salt + n).digest('hex');
      if (hash === challenge.challenge) {
        solvedNumber = n;
        break;
      }
    }

    expect(solvedNumber).toBeGreaterThanOrEqual(0);

    const solution = {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      number: solvedNumber,
      salt: challenge.salt,
      signature: challenge.signature,
    };

    // Verifica con oggetto
    const isValid = altchaService.verifySolution(solution);
    expect(isValid).toBe(true);
  });

  it('dovrebbe verificare con successo un payload codificato in base64', () => {
    const maxNumber = 500;
    const challenge = altchaService.generateChallenge(maxNumber);

    let solvedNumber = -1;
    for (let n = 0; n <= maxNumber; n++) {
      const hash = createHash('sha256').update(challenge.salt + n).digest('hex');
      if (hash === challenge.challenge) {
        solvedNumber = n;
        break;
      }
    }

    const solution = {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      number: solvedNumber,
      salt: challenge.salt,
      signature: challenge.signature,
    };

    const b64 = Buffer.from(JSON.stringify(solution)).toString('base64');
    expect(altchaService.verifySolution(b64)).toBe(true);
  });

  it('dovrebbe rifiutare una soluzione con nonce errato', () => {
    const challenge = altchaService.generateChallenge(100);
    const solution = {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      number: 999999, // Nonce volutamente sbagliato
      salt: challenge.salt,
      signature: challenge.signature,
    };

    expect(() => altchaService.verifySolution(solution)).toThrow(BadRequestException);
  });

  it('dovrebbe rifiutare una sfida con firma HMAC manomessa', () => {
    const challenge = altchaService.generateChallenge(100);
    const solution = {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      number: 0,
      salt: challenge.salt,
      signature: '0000000000000000000000000000000000000000000000000000000000000000', // Firma manomessa
    };

    expect(() => altchaService.verifySolution(solution)).toThrow(BadRequestException);
  });

  it('dovrebbe prevenire replay attacks (stessa firma usata due volte)', () => {
    const maxNumber = 200;
    const challenge = altchaService.generateChallenge(maxNumber);

    let solvedNumber = -1;
    for (let n = 0; n <= maxNumber; n++) {
      const hash = createHash('sha256').update(challenge.salt + n).digest('hex');
      if (hash === challenge.challenge) {
        solvedNumber = n;
        break;
      }
    }

    const solution = {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      number: solvedNumber,
      salt: challenge.salt,
      signature: challenge.signature,
    };

    // Primo uso -> valido
    expect(altchaService.verifySolution(solution)).toBe(true);

    // Secondo uso (replay) -> rifiutato
    expect(() => altchaService.verifySolution(solution)).toThrow(BadRequestException);
  });
});

