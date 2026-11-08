'use server';
import { createServerClient } from '@/lib/pocketbase-server';
import { readCourseGame } from './service';
import type { GameSchedule } from './schedule';

export async function syncGameScheduleAction(courseId: string): Promise<GameSchedule> {
  const game = await readCourseGame(await createServerClient(), courseId);
  if (!game) throw new Error('Acceso no autorizado');
  return { serverNow: Date.now(), classes: game.places.map(({id,date,title})=>({id,date,title})) };
}
