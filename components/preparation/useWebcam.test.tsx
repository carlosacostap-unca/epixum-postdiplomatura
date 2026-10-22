import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useWebcam } from './useWebcam';

let track: EventTarget & { readyState: string; enabled: boolean; muted: boolean; stop: ReturnType<typeof vi.fn> };
const getUserMedia = vi.fn();
beforeEach(() => {
  track = Object.assign(new EventTarget(), { readyState: 'live', enabled: true, muted: false, stop: vi.fn() });
  const stream = { getVideoTracks: () => [track], getTracks: () => [track] };
  getUserMedia.mockReset(); getUserMedia.mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
function attach(camera: ReturnType<typeof useWebcam>) {
  const video = document.createElement('video');
  Object.defineProperties(video, { readyState: { configurable: true, value: 2 }, videoWidth: { value: 640 }, videoHeight: { value: 480 } });
  camera.videoRef.current = video;
}

it('pide sólo video, detecta silencio y desconexión y libera la cámara al salir', async () => {
  const { result, unmount } = renderHook(() => useWebcam()); attach(result.current);
  await act(async () => { await result.current.activate(); });
  expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.any(Object) }));
  expect(result.current.ready).toBe(true);
  act(() => { track.muted = true; track.dispatchEvent(new Event('mute')); });
  expect(result.current.ready).toBe(false);
  act(() => { track.muted = false; track.dispatchEvent(new Event('unmute')); });
  expect(result.current.ready).toBe(true);
  act(() => { track.readyState = 'ended'; track.dispatchEvent(new Event('ended')); });
  expect(result.current.ready).toBe(false);
  unmount(); expect(track.stop).toHaveBeenCalled();
});

it('rechaza permisos denegados sin dejar una cámara activa', async () => {
  getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
  const { result } = renderHook(() => useWebcam()); attach(result.current);
  await act(async () => { await result.current.activate(); });
  expect(result.current.ready).toBe(false);
  expect(result.current.error).toContain('Permití el acceso');
});

it('no solicita cámara para una vista deshabilitada y se apaga al finalizar', async () => {
  const { result, rerender } = renderHook(({ enabled }) => useWebcam(enabled), { initialProps: { enabled: true } }); attach(result.current);
  await act(async () => { await result.current.activate(); });
  rerender({ enabled: false });
  expect(track.stop).toHaveBeenCalled();
  expect(result.current.isLive()).toBe(false);
  await act(async () => { await result.current.activate(); });
  expect(getUserMedia).toHaveBeenCalledTimes(1);
});

it('libera una solicitud pendiente si el usuario abandona la página', async () => {
  let resolve!: (value: unknown) => void;
  getUserMedia.mockReturnValue(new Promise(r => { resolve = r; }));
  const { result, unmount } = renderHook(() => useWebcam()); attach(result.current);
  let activation!: Promise<void>;
  act(() => { activation = result.current.activate(); });
  unmount();
  await act(async () => { resolve({ getVideoTracks: () => [track], getTracks: () => [track] }); await activation; });
  await waitFor(() => expect(track.stop).toHaveBeenCalledOnce());
});
