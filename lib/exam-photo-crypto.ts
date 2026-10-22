import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const EXAM_PHOTO_MAX_BYTES = 300_000;
const prefix = Buffer.from('EPIXPHOTO1');

function key(secret: string) {
  if (secret.length < 32) throw new Error('Falta configurar la clave para las fotos de exámenes.');
  return createHash('sha256').update('epixum/exam-photo/v1\0').update(secret).digest();
}

export function encryptExamPhoto(bytes: Uint8Array, secret: string) {
  if (bytes.length < 100 || bytes.length > EXAM_PHOTO_MAX_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) throw new Error('La foto inicial debe ser una imagen JPEG de hasta 300 KB.');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), nonce);
  cipher.setAAD(prefix);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([prefix, nonce, cipher.getAuthTag(), encrypted]);
}

export function decryptExamPhoto(bytes: Uint8Array, secret: string) {
  const buffer = Buffer.from(bytes);
  if (buffer.length < prefix.length + 28 || !buffer.subarray(0, prefix.length).equals(prefix)) throw new Error('Foto inválida.');
  const decipher = createDecipheriv('aes-256-gcm', key(secret), buffer.subarray(prefix.length, prefix.length + 12));
  decipher.setAAD(prefix);
  decipher.setAuthTag(buffer.subarray(prefix.length + 12, prefix.length + 28));
  return Buffer.concat([decipher.update(buffer.subarray(prefix.length + 28)), decipher.final()]);
}
