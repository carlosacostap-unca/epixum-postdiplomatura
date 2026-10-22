// @vitest-environment node
import dotenv from 'dotenv';
import { describe, expect, it } from 'vitest';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { decryptExamPhoto } from './exam-photo-crypto';

describe.skipIf(process.env.EXAM_PHOTO_INTEGRATION !== '1')('foto inicial en storage real', () => {
  it('almacena una imagen sintética cifrada, la recupera y elimina sólo ese objeto temporal', async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    const { storeExamPhoto, loadExamPhoto } = await import('./exam-photo-storage');
    const { s3Client } = await import('./s3');
    // Synthetic 4×4 gray JPEG, containing no image of a real person.
    const photo = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAEAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwAooooA/9k=', 'base64');
    const stored = await storeExamPhoto('testexamphoto01', 'teststudent0001', photo);
    try {
      const raw = await s3Client.send(new GetObjectCommand({ Bucket: process.env.IDRIVE_BUCKET_NAME, Key: stored.photoKey }));
      const encrypted = Buffer.from(await raw.Body!.transformToByteArray());
      expect(encrypted.includes(photo)).toBe(false);
      expect(decryptExamPhoto(encrypted, process.env.EXAM_PHOTO_ENCRYPTION_KEY || process.env.IDRIVE_SECRET_ACCESS_KEY!)).toEqual(photo);
      expect(await loadExamPhoto(stored.photoKey)).toEqual(photo);
    } finally { await stored.rollback(); }
  }, 60000);
});
