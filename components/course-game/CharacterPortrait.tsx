import type { Character } from '@/lib/course-game/onboarding';
import { characterPixels, type CharacterFacing } from '@/lib/course-game/character-art';

export function CharacterPortrait({ character, className, facing = 'down', label = 'Vista previa de tu personaje' }: { character: Character; className?: string; facing?: CharacterFacing; label?:string }) {
  return <svg className={className} viewBox="0 0 24 36" role="img" aria-label={label} shapeRendering="crispEdges">
    {characterPixels(character, facing).map((pixel, index) => <rect key={index} x={pixel.x} y={pixel.y} width={pixel.w} height={pixel.h} fill={pixel.color} />)}
  </svg>;
}
