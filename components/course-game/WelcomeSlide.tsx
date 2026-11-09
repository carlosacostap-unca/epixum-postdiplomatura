'use client';
import { useEffect,useState } from 'react';
import type { LoadBoard,BoardContent } from '@/lib/course-game/board';
import styles from './welcome-slide.module.css';
export function WelcomeSlide({load,classId}:{load?:LoadBoard;classId:string}) {
 const [content,setContent]=useState<BoardContent|null>(null),[error,setError]=useState(''),[attempt,retry]=useState(0);
 useEffect(()=>{let active=true;if(!load)return;void load(classId).then(r=>{if(active){if(r.success)setContent(r.content);else setError(r.error);}}).catch(()=>{if(active)setError('No pudimos abrir la presentación.');});return ()=>{active=false;};},[load,classId,attempt]);
 return <section className={styles.slide} aria-label="Diapositiva de bienvenida">{error || !load ?<div role="alert">{error || "La presentación no está conectada."}<button disabled={!load} onClick={()=>{setError('');retry(n=>n+1);}}>Reintentar</button></div>:content?<><span>NODO TECNOLÓGICO CATAMARCA · COHORTE 2</span><h1>{content.title}</h1><h2>{content.description}</h2><p>Clase 1 · Carlos Acosta Parra</p><footer>Un espacio para preguntar, aprender y pensar juntos.</footer><small>1 / 1</small></>:<p role="status">Preparando la bienvenida…</p>}</section>;
}
