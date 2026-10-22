'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useWebcam(enabled = true, autoActivate = false) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const epoch = useRef(0);
  const starting = useRef(false);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const isLive = useCallback(() => {
    const video = videoRef.current;
    const tracks = streamRef.current?.getVideoTracks() || [];
    return enabled && !!video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && tracks.length > 0 && tracks.every(t => t.readyState === 'live' && t.enabled && !t.muted);
  }, [enabled]);
  const check = useCallback(() => setReady(isLive()), [isLive]);
  const stop = useCallback(() => {
    epoch.current++;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(check, 500);
    return () => { window.clearInterval(timer); stop(); };
  }, [enabled, check, stop]);

  const activate = useCallback(async () => {
    if (!enabled || starting.current) return;
    starting.current = true;
    stop(); setReady(false); setError(''); setOpening(true);
    const current = epoch.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Usá un navegador compatible en una conexión HTTPS para activar la cámara.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
      if (current !== epoch.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      for (const track of stream.getVideoTracks()) {
        track.addEventListener('mute', check);
        track.addEventListener('unmute', check);
        track.addEventListener('ended', check);
      }
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      check();
    } catch (cause) {
      if (current !== epoch.current) return;
      stop(); setReady(false);
      const name = typeof cause === 'object' && cause !== null && 'name' in cause ? String(cause.name) : '';
      setError(name === 'NotAllowedError' ? 'Permití el acceso a la cámara en el navegador para continuar.' : name === 'NotFoundError' ? 'No encontramos una cámara. Conectala y volvé a intentar.' : name === 'NotReadableError' ? 'La cámara no está disponible. Cerrá otras aplicaciones que la estén usando.' : cause instanceof Error ? cause.message : 'No pudimos activar la cámara.');
    } finally { starting.current = false; setOpening(false); }
  }, [enabled, stop, check]);

  useEffect(() => {
    if (!enabled || !autoActivate) return;
    const timer = window.setTimeout(() => { void activate(); }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, autoActivate, activate]);

  const capture = async () => {
    if (!isLive() || !videoRef.current) throw new Error('Activá la cámara antes de comenzar.');
    const video = videoRef.current;
    const scale = Math.min(640 / video.videoWidth, 480 / video.videoHeight, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos tomar la foto inicial.');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No pudimos tomar la foto inicial.')), 'image/jpeg', 0.7));
  };
  return { videoRef, ready, opening, error, activate, check, isLive, capture };
}
