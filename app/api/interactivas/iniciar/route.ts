import { startSessionSchema } from '@/lib/live-interactive-contract';
import { startLiveSession } from '@/lib/live-interactive';
import { liveBody, liveFailure, liveHeaders, liveRequestClient } from '@/lib/live-interactive-http';

export async function POST(request: Request) {
  try {
    const { courseId, lessonId } = startSessionSchema.parse(await liveBody(request));
    const session = await startLiveSession(await liveRequestClient(), courseId, lessonId);
    return Response.json({ id: session.id }, { headers: liveHeaders });
  } catch (error) { return liveFailure(error); }
}
