'use client';
/* eslint-disable @next/next/no-img-element -- Resource URLs can be signed and must load directly without an image proxy. */
import { useEffect, useState } from 'react';
import { resourceView, type BoardContent, type LoadBoard } from '@/lib/course-game/board';
import { BoardHtml } from './BoardHtml';
import styles from './lesson-board.module.css';
export function LessonBoard({classId,load}:{classId:string;load?:LoadBoard}) {
  return <BoardReader key={classId} classId={classId} load={load} />;
}
function BoardReader({classId,load}:{classId:string;load?:LoadBoard}) {
  const [content,setContent]=useState<BoardContent|null>(null);
  const [error,setError]=useState(load ? '' : 'El contenido no está conectado en esta vista.');
  const [attempt,setAttempt]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    if(!load) return;
    void load(classId).then(result=>{if(active) { if(result.success) setContent(result.content); else setError(result.error); }}).catch(()=>{if(active)setError('No pudimos cargar la pizarra. Intentá nuevamente.');});
    return ()=>{active=false;};
  },[classId,load,attempt]);
  const resource=content?.resources.find(item=>item.id===selected);
  const view=resource?resourceView(resource):null;
  return <section className={styles.board} aria-label="Pizarra de la clase">
    {!content&&!error&&<p role="status">Preparando la pizarra…</p>}
    {error&&<div role="alert"><p>{error}</p><button type="button" onClick={()=>{setError('');setContent(null);setSelected(null);setAttempt(a=>a+1);}}>Reintentar</button></div>}
    {content&&<><nav className={styles.tabs} aria-label="Contenido de la pizarra"><button type="button" aria-pressed={selected===null} onClick={()=>setSelected(null)}>Clase</button>{content.resources.map(item=><button key={item.id} type="button" aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}>{item.title}</button>)}</nav>
    <div className={styles.content}>
    {!selected?<><h3>{content.title}</h3>{content.description.trim()?<BoardHtml html={content.description}/>:<p>El docente todavía no añadió una descripción a esta clase.</p>}{!content.resources.length&&<p className={styles.note}>Todavía no hay materiales publicados para este encuentro.</p>}</>:resource&&<><h3>{resource.title}</h3>
      {!view?<p role="alert">No se pudo preparar este material. Cerrá y volvé a abrir la pizarra para reintentar.</p>:<>
        {view.kind==='frame'&&<iframe key={view.url} className={styles.viewer} src={view.url} title={resource.title} sandbox={new URL(view.url).hostname === "www.youtube-nocookie.com" || new URL(view.url).hostname === "docs.google.com" ? "allow-scripts allow-same-origin allow-presentation" : "allow-scripts allow-presentation"} allow="fullscreen" referrerPolicy="no-referrer"/>}
        {view.kind==='video'&&<video className={styles.media} controls src={view.url}/>}
        {view.kind==='audio'&&<audio className={styles.media} controls src={view.url}/>}
        {view.kind==='image'&&<img className={styles.media} src={view.url} alt={resource.title} referrerPolicy="no-referrer"/>}
        <p className={styles.note}>{view.kind==='link'?'Este material no ofrece una vista integrada compatible.':'Si el proveedor bloquea la vista integrada, podés abrir el material aparte.'} <a href={view.url} target="_blank" rel="noopener noreferrer">Abrir material ↗</a></p>
      </>}
    </>}
    </div></>}
  </section>;
}
