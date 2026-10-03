import { joinSessionSchema } from '@/lib/live-interactive-contract';
import { joinLiveSession } from '@/lib/live-interactive';
import { liveBody, liveFailure, liveHeaders, liveRequestClient, resolveLiveCode } from '@/lib/live-interactive-http';

export async function POST(request: Request) {
  try {
    const { code } = joinSessionSchema.parse(await liveBody(request));
    const session = await joinLiveSession(await liveRequestClient(), code, resolveLiveCode);
    return Response.json({ id: session.id }, { headers: liveHeaders });
  } catch (error) { return liveFailure(error); }
}
