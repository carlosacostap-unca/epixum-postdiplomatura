import { timingSafeEqual } from 'node:crypto';
import { expireCourseExams } from '@/lib/course-exam-data';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.EXAM_CRON_SECRET;
  const supplied = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return new Response('Unauthorized', { status: 401 });
  await expireCourseExams();
  return Response.json({ success: true });
}
