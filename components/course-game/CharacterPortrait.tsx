import type { Character } from '@/lib/course-game/onboarding';
import { characterPixels } from '@/lib/course-game/character-art';

export function CharacterPortrait({ character, className }: { character: Character; className?: string }) {
  return <svg className={className} viewBox="0 0 24 36" role="img" aria-label="Vista previa de tu personaje" shapeRendering="crispEdges">
    {characterPixels(character).map((pixel, index) => <rect key={index} x={pixel.x} y={pixel.y} width={pixel.w} height={pixel.h} fill={pixel.color} />)}
  </svg>;
}
