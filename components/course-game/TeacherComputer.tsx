'use client';
import { useEffect,useState } from 'react';
import { safeResourceUrl,type LoadBoard,type BoardContent } from '@/lib/course-game/board';
import styles from './teacher-computer.module.css';
export function TeacherComputer({load,classId}:{load?:LoadBoard;classId:string}) {
 const [result,setResult]=useState<{classId:string;content?:BoardContent;error?:string}|null>(null);
 const [folder,setFolder]=useState(false),[attempt,retry]=useState(0);
 useEffect(()=>{let active=true;if(!load)return;void load(classId).then(r=>{if(active)setResult(r.success?{classId,content:r.content}:{classId,error:r.error});}).catch(()=>{if(active)setResult({classId,error:'No pudimos cargar los enlaces de la clase.'});});return()=>{active=false;};},[load,classId,attempt]);
 const current=result?.classId===classId?result:null;
 return <section className={styles.computer} aria-label="Computadora del docente">
  <header className={styles.bar}><span className={styles.light}/> EPIXUM · Mi computadora</header>
  <nav className={styles.path} aria-label="Ubicación en la computadora"><button onClick={()=>setFolder(false)} disabled={!folder}>Escritorio</button>{folder&&<span> / Clase 1</span>}</nav>
  {!folder?<div className={styles.desktop}><button className={styles.folder} onClick={()=>setFolder(true)} aria-label="Abrir carpeta Clase 1"><span className={styles.folderIcon} aria-hidden="true"/><strong>Clase 1</strong></button><p>Seleccioná una carpeta para ver sus archivos.</p></div>:<div className={styles.window}>
   <h2>Clase 1</h2><p className={styles.subtitle}>Accesos de la clase</p>
   {!load || current?.error ? <div role="alert">{current?.error || 'La computadora no está conectada.'}<button disabled={!load} onClick={()=>{setResult(null);retry(n=>n+1);}}>Reintentar</button></div> : !current?.content ? <p role="status">Cargando enlaces…</p> : <ul className={styles.files}>{[{id:'live',label:'Clase en vivo',icon:'▶'},{id:'recording',label:'Grabación',icon:'▷'},{id:'slides',label:'Diapositivas',icon:'▤'}].map(item=>{
    const resource=current.content!.resources.find(r=>r.id===item.id),url=resource&&safeResourceUrl(resource.url);
    return <li key={item.id}>{url?<a href={url} target="_blank" rel="noopener noreferrer"><span className={styles.fileIcon} aria-hidden="true">{item.icon}</span><span><strong>{item.label}</strong><small>{item.id==='slides'?'Google · enlace provisional':'Abrir en una pestaña nueva'}</small></span><span aria-hidden="true">↗</span></a>:<div className={styles.unavailable}><span className={styles.fileIcon} aria-hidden="true">{item.icon}</span><span><strong>{item.label}</strong><small>Enlace todavía no disponible</small></span></div>}</li>;
   })}</ul>}
  </div>}
  <footer className={styles.taskbar}><span>◈ Epixum</span><span>{folder?'Clase 1':'Escritorio'}</span></footer>
 </section>;
}
