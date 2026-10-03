import { liveCommandSchema } from '@/lib/live-interactive-contract';
import { executeLiveCommand, readLiveState } from '@/lib/live-interactive';
import { liveBody, liveFailure, liveHeaders, liveRequestClient } from '@/lib/live-interactive-http';

type Context = { params: Promise<{ sessionId: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { sessionId } = await context.params;
    const activity = new URL(request.url).searchParams.get('actividad') || undefined;
    return Response.json(await readLiveState(await liveRequestClient(), sessionId, activity), { headers: liveHeaders });
  } catch (error) { return liveFailure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const command = liveCommandSchema.parse(await liveBody(request));
    const { sessionId } = await context.params;
    await executeLiveCommand(await liveRequestClient(), sessionId, command);
    return Response.json({ ok: true }, { headers: liveHeaders });
  } catch (error) { return liveFailure(error); }
}
