'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GamePlace } from '@/lib/course-game/model';
import { argentinaDateTime } from '@/lib/course-game/schedule';
import { robotDogPixels } from '@/lib/course-game/robot-dog';
import styles from './immersive-game.module.css';

export function companionAnswer(question:string,courseTitle:string,places:GamePlace[],fresh:boolean,inside:boolean,inClass:boolean) {
  const q=question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/horario|fecha|cuando|cerrad|abre|abren|proxima/.test(q)) {
    if(!fresh) return 'Todavía no puedo confirmar los horarios con el servidor. Esperá a que se sincronice el reloj. La recepción sigue disponible.';
    return places.length ? 'Estos son los inicios de las clases, en horario de Argentina:\n'+places.map(p=>`${p.title}: ${Number.isFinite(Date.parse(p.date))?argentinaDateTime(Date.parse(p.date)):'horario por confirmar'}`).join('\n')+'\nCada puerta abre al llegar su horario. Los cambios se consultan automáticamente en PocketBase.' : 'Todavía no hay clases publicadas en el calendario. Podés consultar en el mostrador de recepción mientras tanto.';
  }
  if(/caminar|mover|controles|teclado|mouse|tap|clic|jugar/.test(q)) return 'Hacé clic o tap en un lugar libre del suelo para caminar. También podés usar las flechas del teclado o WASD. La cámara te sigue mientras recorrés la plaza y las calles del barrio. Un nuevo destino reemplaza al anterior. Si estoy en el camino, me aparto para dejarte pasar.';
  if(/pizarra|material|contenido|leer|video/.test(q)) return 'Entrá al aula y acercate a su pizarra. Cuando aparezca «Ver pizarra», tocala o presioná E. Allí podés leer los textos y consultar los materiales publicados. Al cerrar, seguís dentro del juego.';
  if(/mision|trabajo|entrega|actividad|diario|progreso/.test(q)) return 'Misiones reúne los trabajos publicados, sus estados y fechas de entrega. Consultá cada consigna para saber qué presentar. Mi diario muestra tu progreso. No puedo corregir trabajos ni confirmar una entrega desde esta conversación.';
  if(/salir|volver|epixum|menu/.test(q)) return 'Abrí Menú y elegí «Volver a Epixum» para ir a https://www.epixum.com. También podés abrir el aula clásica. Para cerrar esta charla y seguir jugando, tocá «Volver al juego» o presioná Escape.';
  if(/curso|pensamiento|critico|ia|inteligencia|aprender|aula 0/.test(q)) return `Estás en ${courseTitle}. La recepción está siempre disponible y presenta el curso: examinar evidencias, reconocer supuestos y contrastar respuestas al resolver problemas con IA. Para objetivos, consignas y materiales de un encuentro concreto, consultá su pizarra. No tengo aquí el programa detallado ni información sobre calificaciones o certificados.`;
  if(/donde|ayuda|entrar|aula|nodo|seguir/.test(q)) return inClass ? 'Estás dentro de un aula. Caminá hacia la pizarra para leer el contenido, o hacia la salida inferior para volver al pasillo.' : inside ? 'Estás en el Nodo. Tocá una puerta abierta para caminar hasta ella y entrar. El mostrador de recepción está junto al pasillo central y siempre está disponible.' : 'Tocá la entrada del Nodo Tecnológico para caminar hasta el edificio y entrar. Después podés consultar en recepción o entrar a una clase habilitada.';
  return 'Puedo orientarte con los controles, las aulas, las pizarras, los horarios y el funcionamiento general del curso. No tengo una respuesta para esa consulta. Probá una de las preguntas sugeridas; para dudas específicas sobre contenidos o evaluaciones, consultá al equipo docente.';
}

export function dialoguePages(text:string) {
  const pages:string[]=[];
  let rest=text.trim();
  while(rest.length>230) {
    const sentence=rest.lastIndexOf('. ',229)+1;
    const boundary=sentence>80?sentence:rest.lastIndexOf(' ',230);
    const end=boundary>0?boundary:230;
    pages.push(rest.slice(0,end));rest=rest.slice(end).trim();
  }
  if(rest) pages.push(rest);
  return pages;
}

export function CompanionChat({courseTitle,places,fresh,inside,inClass,petName='Perro robot',onClose=()=>{},conversation}:{courseTitle:string;places:GamePlace[];fresh:boolean;inside:boolean;inClass:boolean;petName?:string;onClose?:()=>void;conversation?:{name:string;intro:string;questions:string[];answer:(question:string)=>string;portrait?:ReactNode;subtitle?:string}}) {
  const [answer,setAnswer]=useState(conversation?.intro ?? '¡Hola! ¿Necesitás una pata? Estoy acá para acompañarte. Podemos hablar sobre cómo jugar, el curso o los horarios de las aulas.');
  const [page,setPage]=useState(0);
  const [question,setQuestion]=useState('');
  const [writing,setWriting]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const choices=useRef<HTMLDivElement>(null);
  const pages=dialoguePages(answer);
  const last=page===pages.length-1;
  const text=pages[page];
  const [progress,setProgress]=useState({text:'',count:0});
  const [utterance,setUtterance]=useState(0);
  const [reducedMotion,setReducedMotion]=useState(false);
  const count=reducedMotion?text.length:progress.text===text?progress.count:0;
  const typing=count<text.length;
  useEffect(()=>{
    if(typeof window.matchMedia!=='function') return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReducedMotion(media.matches);
    change();media.addEventListener('change',change);
    return ()=>media.removeEventListener('change',change);
  },[]);
  useEffect(()=>{
    if(reducedMotion) return;
    const timer=window.setInterval(()=>setProgress(previous=>{
      const count=previous.text===text?previous.count:0;
      if(count>=text.length){window.clearInterval(timer);return previous;}
      return {text,count:count+1};
    }),28);
    return ()=>window.clearInterval(timer);
  },[text,reducedMotion,utterance]);
  useEffect(()=>{
    const element=dialog.current!;
    const trigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
    element.showModal();element.focus();
    return ()=>{element.close();trigger?.focus();};
  },[]);
  const ask=(text:string)=>{
    const value=text.trim().slice(0,500);if(!value)return;
    setAnswer(conversation ? conversation.answer(value) : companionAnswer(value,courseTitle,places,fresh,inside,inClass));setPage(0);setProgress({text:'',count:0});setQuestion('');setWriting(false);
    setUtterance(value=>value+1);
    dialog.current?.focus();
  };
  const advance=()=>{if(typing)setProgress({text,count:text.length});else if(!last)setPage(p=>p+1);else choices.current?.querySelector('button')?.focus();};
  return <dialog ref={dialog} tabIndex={-1} aria-label={conversation?.name ?? "Tu perro robot"} className={styles.npcDialog}
    onCancel={e=>{e.preventDefault();onClose();}}
    onClick={e=>{if(!(e.target as HTMLElement).closest('button,input,form'))advance();}}
    onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target===e.currentTarget){e.preventDefault();if(!e.repeat)advance();}}}>
    <div className={styles.npcFrame}>
      <div className={styles.npcPortrait}>{conversation?.portrait ?? <svg viewBox="0 0 32 28" role="img" aria-label="Retrato del perro robot" shapeRendering="crispEdges">{robotDogPixels('right').map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</svg>}<strong style={{overflowWrap:'anywhere'}}>{conversation?.name ?? petName}</strong><span>{conversation?.subtitle ?? (conversation?.portrait ? "Compañera de clase" : "Tu compañero")}</span></div>
      <div className={styles.npcSpeech}>
        <button type="button" className={styles.npcClose} aria-label="Cerrar y volver al juego" onClick={onClose}>×</button>
        <div role="log" aria-live="polite" aria-label={conversation ? "Conversación con "+conversation.name : "Conversación con tu perro robot"} className={`${styles.npcText} ${styles.npcTypewriter}`}>
          <span className={styles.srOnly}>{text}</span>
          <span aria-hidden="true" className={styles.npcTextMeasure}>{text}</span>
          <span aria-hidden="true" data-testid="dialogue-visible-text">{text.slice(0,count)}</span>
        </div>
        {typing || !last ? <button type="button" className={styles.npcContinue} onClick={advance}>{typing?'Mostrar texto completo':'Continuar ▸'} <small>{page+1}/{pages.length}</small></button> : <>
          <div ref={choices} className={styles.npcChoices} aria-label="Preguntas sugeridas">{(conversation?.questions ?? ['¿Cómo jugar?','¿De qué trata el curso?','¿Cuándo abren las aulas?','¿Cómo uso la pizarra?','¿Dónde voy ahora?']).map(q=><button type="button" key={q} aria-label={q} onClick={()=>ask(q)}>▸ {q}</button>)}{!conversation && <button type="button" onClick={()=>setWriting(v=>!v)}>▸ Otra pregunta…</button>}<button type="button" onClick={onClose}>▸ Hasta luego</button></div>
          {writing&&<form className={styles.npcQuestion} onSubmit={e=>{e.preventDefault();ask(question);}}><label htmlFor="companion-question">Tu pregunta</label><div><input autoFocus id="companion-question" maxLength={500} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Escribí tu pregunta…"/><button type="submit" disabled={!question.trim()}>Preguntar</button></div></form>}
        </>}
        <span className={styles.npcHint}>{typing?'Clic, tap o Enter para completar':'Clic, tap o Enter para continuar'} · Esc para salir</span>
      </div>
    </div>
  </dialog>;
}
