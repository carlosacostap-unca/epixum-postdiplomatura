import 'server-only';
import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './s3';
import { decryptExamPhoto, encryptExamPhoto } from './exam-photo-crypto';

function configuration() {
  const bucket = process.env.IDRIVE_BUCKET_NAME;
  // Prefer a dedicated stable secret; existing installations use the storage secret.
  const secret = process.env.EXAM_PHOTO_ENCRYPTION_KEY || process.env.IDRIVE_SECRET_ACCESS_KEY;
  if (!bucket || !secret) throw new Error('Falta configurar el almacenamiento de fotos.');
  return { bucket, secret };
}

export async function storeExamPhoto(courseId: string, studentId: string, bytes: Uint8Array) {
  const { bucket, secret } = configuration();
  const body = encryptExamPhoto(bytes, secret);
  const photoKey = `private/exam-photos/${courseId}/${studentId}/${randomUUID()}.enc`;
  try { await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: photoKey, Body: body, ContentType: 'application/octet-stream', CacheControl: 'no-store', ACL: 'private' })); }
  catch (error) {
    // This key belongs exclusively to this upload and has no linked attempt yet.
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: photoKey })).catch(() => {});
    throw error;
  }
  return { photoKey, rollback: async () => { await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: photoKey })); } };
}

export async function loadExamPhoto(photoKey: string) {
  if (!/^private\/exam-photos\/[a-z0-9]{15}\/[a-z0-9]{15}\/[a-f0-9-]{36}\.enc$/.test(photoKey)) throw new Error('Referencia de foto inválida.');
  const { bucket, secret } = configuration();
  const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: photoKey }));
  if (!response.Body || (response.ContentLength && response.ContentLength > 301_000)) throw new Error('Foto inválida.');
  return decryptExamPhoto(await response.Body.transformToByteArray(), secret);
}
