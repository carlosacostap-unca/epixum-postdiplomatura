import { EventSource } from 'eventsource';
import { liveAccess } from '@/lib/live-interactive';
import { liveFailure, liveRequestClient } from '@/lib/live-interactive-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
globalThis.EventSource ??= EventSource as unknown as typeof globalThis.EventSource;

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await context.params;
    const pb = await liveRequestClient();
    const { teacher } = await liveAccess(pb, sessionId);
    const encoder = new TextEncoder();
    let cleanup = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let ended = false;
        const unsubscribers: (() => Promise<void>)[] = [];
        const send = (value: string) => { if (!ended) controller.enqueue(encoder.encode(value)); };
        const finish = () => {
          if (ended) return;
          ended = true;
          clearInterval(heartbeat);
          clearTimeout(lifetime);
          request.signal.removeEventListener('abort', finish);
          void Promise.allSettled(unsubscribers.map((unsubscribe) => unsubscribe()));
          void pb.realtime.unsubscribe().catch(() => {});
          try { controller.close(); } catch { /* consumer already cancelled */ }
        };
        cleanup = finish;
        const heartbeat = setInterval(() => send(': keepalive\n\n'), 10_000);
        const lifetime = setTimeout(finish, 55_000);
        request.signal.addEventListener('abort', finish, { once: true });
        if (request.signal.aborted) { finish(); return; }
        send('retry: 1500\n\n');
        const notify = () => send('event: change\ndata: {}\n\n');
        const register = async (collection: string, topic: string) => {
          const unsubscribe = await pb.collection(collection).subscribe(topic, (event) => {
            if (collection === 'interactive_sessions' || event.record.session === sessionId) notify();
          });
          if (ended) await unsubscribe(); else unsubscribers.push(unsubscribe);
        };
        void (async () => {
          await register('interactive_sessions', sessionId);
          if (teacher && !ended) {
            await register('interactive_participants', '*');
            if (!ended) await register('interactive_responses', '*');
          }
          send('event: ready\ndata: {}\n\n');
        })().catch(finish);
      },
      cancel() { cleanup(); },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
  } catch (error) { return liveFailure(error); }
}
