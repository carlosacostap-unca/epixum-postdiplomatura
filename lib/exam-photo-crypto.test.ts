// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { decryptExamPhoto, encryptExamPhoto, EXAM_PHOTO_MAX_BYTES } from './exam-photo-crypto';

const secret = 'test-only-secret-'.repeat(4);
const photo = Buffer.alloc(150, 1);
photo[0] = 0xff; photo[1] = 0xd8; photo[148] = 0xff; photo[149] = 0xd9;

describe('foto inicial cifrada', () => {
  it('guarda bytes cifrados y permite recuperarlos con la clave correcta', () => {
    const encrypted = encryptExamPhoto(photo, secret);
    expect(encrypted.includes(photo)).toBe(false);
    expect(decryptExamPhoto(encrypted, secret)).toEqual(photo);
    expect(encryptExamPhoto(photo, secret)).not.toEqual(encrypted);
  });
  it('rechaza archivos alterados, otra clave y formatos o tamaños inválidos', () => {
    const encrypted = encryptExamPhoto(photo, secret);
    expect(() => decryptExamPhoto(encrypted, 'another-test-only-secret-'.repeat(4))).toThrow();
    encrypted[encrypted.length - 1] ^= 1;
    expect(() => decryptExamPhoto(encrypted, secret)).toThrow();
    expect(() => encryptExamPhoto(Buffer.alloc(150), secret)).toThrow();
    expect(() => encryptExamPhoto(Buffer.alloc(EXAM_PHOTO_MAX_BYTES + 1), secret)).toThrow();
    expect(() => encryptExamPhoto(photo, 'short')).toThrow();
  });
});
