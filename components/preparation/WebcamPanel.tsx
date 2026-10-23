'use client';

import { Button, Card, CardContent } from '@/components/ui';
import type { useWebcam } from './useWebcam';

export function WebcamPanel({ camera: { videoRef, check, ready, opening, activate, error }, initialPhoto = true }: { camera: ReturnType<typeof useWebcam>; initialPhoto?: boolean }) {
  return <Card><CardContent className="space-y-3">
    <h2 className="text-lg font-bold">Cámara del examen</h2>
    <video ref={videoRef} autoPlay playsInline muted onLoadedData={check} aria-label="Vista previa de tu cámara" className="aspect-video w-full max-w-sm rounded-xl bg-black object-contain" />
    <p role="status">{ready ? 'Cámara activa.' : 'Activá la cámara para responder. Si se desconecta, las respuestas se bloquean y el reloj continúa.'}</p>
    {!ready && <Button isPending={opening} pendingLabel="Activando cámara…" onClick={activate}>Activar cámara</Button>}
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
    <p className="text-sm text-[var(--color-text-muted)]">El video se muestra sólo en tu dispositivo. {initialPhoto ? 'Se guarda una única foto al iniciar cada intento, visible sólo para administradores y docentes del curso.' : 'Este parcial no guarda fotos.'} No se graba video ni audio ni se toman fotos durante el examen.</p>
  </CardContent></Card>;
}
