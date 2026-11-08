'use client';

import { useEffect, useRef, useState } from 'react';
import type { VillageEngine, VillageState } from './phaser/village-engine';
import { loadVillageEngine } from './village-loader';
import styles from './immersive-game.module.css';
import { WORLD_WIDTH, WORLD_HEIGHT } from '@/lib/course-game/neighborhood';

export default function PhaserVillage(props: VillageState) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<VillageEngine | null>(null);
  const latest = useRef(props);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => { latest.current = props; engine.current?.update(props); }, [props]);

  useEffect(() => {
    let disposed = false;
    let mounted: VillageEngine | null = null;
    const destroy = () => { mounted?.destroy(); mounted = null; engine.current = null; };
    const timeout = window.setTimeout(() => {
      if (!disposed) { setStatus('failed'); destroy(); disposed = true; }
    }, 15000);
    void loadVillageEngine().then(({ createVillageEngine }) => {
      if (disposed || !host.current) return;
      mounted = createVillageEngine(host.current, latest.current, () => {
        window.clearTimeout(timeout);
        if (!disposed) setStatus('ready');
      });
      engine.current = mounted;
    }).catch((error: unknown) => {
      console.error('No se pudo iniciar el paisaje del curso.', error);
      window.clearTimeout(timeout);
      if (!disposed) setStatus('failed');
    });
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      destroy();
    };
  }, []);

  return <>
    <div ref={host} className={styles.phaserCanvas} style={props.interior || props.classroom ? undefined : {left:`${-40/WORLD_WIDTH*100}%`,top:`${-40/WORLD_HEIGHT*100}%`,width:`${(1+80/WORLD_WIDTH)*100}%`,height:`${(1+80/WORLD_HEIGHT)*100}%`,right:'auto',bottom:'auto'}} aria-hidden="true" />
    {status !== 'ready' && <p role="status" className={styles.engineStatus}>{status === 'loading' ? 'Preparando el valle…' : 'El paisaje no pudo cargarse. Podés elegir un encuentro o usar la vista Lista.'}</p>}
  </>;
}
