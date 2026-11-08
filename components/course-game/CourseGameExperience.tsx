'use client';
import { useState } from 'react';
import type { CourseGameView } from '@/lib/course-game/model';
import type { GameProgress, GameWelcomeState, WelcomeActions } from '@/lib/course-game/onboarding';
import type { LoadBoard } from '@/lib/course-game/board';
import CourseMissionMap from './CourseMissionMap';
import { GameWelcome } from './GameWelcome';
import type { SyncGameSchedule } from '@/lib/course-game/schedule';

export default function CourseGameExperience({ game, welcome, actions, preview = false, loadBoard, syncSchedule }: { syncSchedule?: SyncGameSchedule; loadBoard?: LoadBoard; game: CourseGameView; welcome: GameWelcomeState; actions: WelcomeActions; preview?: boolean }) {
  const [progress, setProgress] = useState<GameProgress | null>(welcome.character ? { character: welcome.character, tourStep: welcome.tourStep, completed: welcome.completed } : null);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(welcome.profile);
  const [error, setError] = useState('');
  if (!progress) return <GameWelcome profile={profile} save={actions.save} onSaved={(next, savedProfile) => { setProgress(next); setProfile(savedProfile); }} preview={preview} />;
  async function advance() {
    if (busy || !progress) return;
    setBusy(true); setError('');
    try {
      const result = await actions.advance(progress.tourStep);
      if (result.success) setProgress(result.progress); else setError(result.error);
    } catch { setError('No pudimos guardar este paso. Intentá nuevamente.'); }
    finally { setBusy(false); }
  }
  return <CourseMissionMap renderIdentity={actions.update ? close => <GameWelcome editing initialCharacter={progress.character} profile={profile} preview={preview} save={actions.update!} onCancel={close} onSaved={(next, savedProfile) => { setProgress(next); setProfile(savedProfile); close(); }} /> : undefined} syncSchedule={syncSchedule} loadBoard={loadBoard} game={game} character={progress.character} tutorial={progress.completed ? undefined : { step: progress.tourStep, busy, error, onNext: advance }} />;
}
