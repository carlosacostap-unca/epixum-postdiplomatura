import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { readCourseExamPhotoKey, requireExamCourse } from '@/lib/course-exam-service';
import { loadExamPhoto } from '@/lib/exam-photo-storage';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string; attemptId: string }> }) {
  try {
    const { courseId, attemptId } = await params;
    const pb = await createServerClient();
    await requireExamCourse(pb, courseId, 'manage');
    const key = await readCourseExamPhotoKey(pb, await createServiceClient(), courseId, attemptId);
    const photo = await loadExamPhoto(key);
    return new Response(new Uint8Array(photo), { headers: { 'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline; filename="foto-inicial.jpg"', 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response('Foto no disponible.', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
