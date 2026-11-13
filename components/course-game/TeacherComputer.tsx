'use client';
import { useEffect,useState,type ReactNode } from 'react';
import { safeResourceUrl,type LoadBoard,type BoardContent } from '@/lib/course-game/board';
import styles from './teacher-computer.module.css';
export function TeacherComputer({load,classId,label="Computadora del docente",activities,activitiesLabel="Actividades de la clase"}:{activitiesLabel?:string;load?:LoadBoard;classId:string;label?:string;activities?:ReactNode}) {
 const [result,setResult]=useState<{classId:string;content?:BoardContent;error?:string}|null>(null);
 const [activity,setActivity]=useState(false);
 const [folder,setFolder]=useState(false),[attempt,retry]=useState(0);
 useEffect(()=>{let active=true;if(!load)return;void load(classId).then(r=>{if(active)setResult(r.success?{classId,content:r.content}:{classId,error:r.error});}).catch(()=>{if(active)setResult({classId,error:'No pudimos cargar los enlaces de la clase.'});});return()=>{active=false;};},[load,classId,attempt]);
 const current=result?.classId===classId?result:null;
 const title=current?.content?.title || 'Clase 1';
 return <section className={styles.computer} aria-label={label}>
  <header className={styles.bar}><span className={styles.light}/> EPIXUM · Mi computadora</header>
  <nav className={styles.path} aria-label="Ubicación en la computadora"><button onClick={()=>{setFolder(false);setActivity(false);}} disabled={!folder}>Escritorio</button>{folder&&<span> / {title}</span>}</nav>
  {!folder?<div className={styles.desktop}><button className={styles.folder} onClick={()=>setFolder(true)} aria-label={`Abrir carpeta ${title}`}><span className={styles.folderIcon} aria-hidden="true"/><strong>{title}</strong></button><p>Seleccioná una carpeta para ver sus archivos.</p></div>:<div className={styles.window}>
   <h2>{title}</h2>{activity ? <><button onClick={()=>setActivity(false)}>← Volver a {title}</button>{activities}</> : <><p className={styles.subtitle}>Accesos de la clase</p>
   {!load || current?.error ? <div role="alert">{current?.error || 'La computadora no está conectada.'}<button disabled={!load} onClick={()=>{setResult(null);retry(n=>n+1);}}>Reintentar</button></div> : !current?.content ? <p role="status">Cargando enlaces…</p> : <ul className={styles.files}>{[{id:'live',label:'Clase en vivo',icon:'▶'},{id:'recording',label:'Grabación',icon:'▷'},{id:'slides',label:'Diapositivas',icon:'▤'},...current.content!.resources.filter(r=>!['live','recording','slides'].includes(r.id)).map(r=>({id:r.id,label:r.title,icon:'▤'}))].map(item=>{
    const resource=current.content!.resources.find(r=>r.id===item.id),url=resource&&safeResourceUrl(resource.url);
    return <li key={item.id}>{url?<a href={url} target="_blank" rel="noopener noreferrer"><span className={styles.fileIcon} aria-hidden="true">{item.icon}</span><span><strong>{item.label}</strong><small>Abrir en una pestaña nueva</small></span><span aria-hidden="true">↗</span></a>:<div className={styles.unavailable}><span className={styles.fileIcon} aria-hidden="true">{item.icon}</span><span><strong>{item.label}</strong><small>Enlace todavía no disponible</small></span></div>}</li>;
   })}</ul>}
   {activities && <button className={styles.activity} onClick={()=>setActivity(true)}>▤ {activitiesLabel}</button>}</>}
  </div>}
  <footer className={styles.taskbar}><span>◈ Epixum</span><span>{folder?title:'Escritorio'}</span></footer>
 </section>;
}
