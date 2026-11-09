'use client';
import type { Dispatch, SetStateAction } from 'react';
import { SOFIA_ACTIONS, SOFIA_QUESTIONS, sofiaFeedback, type SofiaProgress } from '@/lib/course-game/sofia';
import styles from './sofia-mission.module.css';
export function SofiaMission({progress:p,onChange,onTalk,onHint}:{progress:SofiaProgress;onChange:Dispatch<SetStateAction<SofiaProgress>>;onTalk:()=>void;onHint:()=>void}) {
 const update=(patch:Partial<SofiaProgress>)=>onChange(previous=>({...previous,...patch,reviewed:false}));
 const feedback=sofiaFeedback(p);
 return <section className={styles.mission} aria-label="Misión Sofía y su examen">
 <span className={styles.kicker}>AULA 1 · MISIÓN DE PRÁCTICA</span><h2>Sofía y su examen</h2>
 <p>Una respuesta ordenada puede esconder un problema. Investigá antes de recomendar un plan.</p>
 <blockquote>“Tengo seis días y seis temas para un examen. ¿Cómo me organizo?”<br/><strong>Respuesta de la IA:</strong> “Estudiá un tema por día.”</blockquote>
 <div className={styles.tools}><button onClick={onTalk}>Conversar con Sofía · {p.clues.length}/3 datos</button><button onClick={onHint}>Pedir una pista al perro</button></div>
 <details open={p.clues.length>0}><summary>Mis notas de la conversación</summary>{p.clues.length ? <ul>{p.clues.map(q=><li key={q}>{SOFIA_QUESTIONS[q as keyof typeof SOFIA_QUESTIONS]}</li>)}</ul>:<p>Todavía no investigaste la situación de Sofía.</p>}</details>
 <form onSubmit={e=>{e.preventDefault();onChange(previous=>({...previous,reviewed:true}));}}>
 <fieldset><legend>1. Comprobá si el plan es viable</legend><div className={styles.numbers}><label>Horas disponibles<input type="number" min="0" max="100" value={p.available} onChange={e=>update({available:e.target.value})}/></label><label>Horas estimadas necesarias<input type="number" min="0" max="100" value={p.needed} onChange={e=>update({needed:e.target.value})}/></label></div><p>La estimación también puede revisarse: no es una certeza.</p></fieldset>
 <fieldset><legend>2. ¿Qué harías con la respuesta?</legend>{[['copiar','Usarla tal como está'],['adaptar','Usarla como punto de partida y adaptarla'],['descartar','Descartarla sin investigar más']].map(([value,label])=><label key={value}><input type="radio" name="sofia-verdict" value={value} checked={p.verdict===value} onChange={()=>update({verdict:value})}/>{label}</label>)}</fieldset>
 <fieldset><legend>3. Elegí tus próximos pasos</legend>{SOFIA_ACTIONS.map(action=><label key={action}><input type="checkbox" checked={p.actions.includes(action)} onChange={e=>update({actions:e.target.checked?[...p.actions,action]:p.actions.filter(a=>a!==action)})}/>{action}</label>)}</fieldset>
 <label className={styles.reflection}>4. Tu recomendación para Sofía<textarea rows={4} maxLength={1500} value={p.reflection} onChange={e=>update({reflection:e.target.value})} placeholder="Qué conservarías, qué cambiarías y qué comprobarías antes de decidir…"/></label>
 <button type="submit">Revisar mi propuesta</button>
 </form>
 {p.reviewed && <div role="status" className={styles.feedback}><h3>{feedback.length?'Una oportunidad para revisar':'Recorrido de práctica completado'}</h3>{feedback.length?<ul>{feedback.map(note=><li key={note}>{note}</li>)}</ul>:<><p>Identificaste la diferencia entre tiempo disponible y estimado, y propusiste revisar el plan. Tu reflexión queda en Mi diario durante esta sesión.</p><p>Para pensar: ¿qué dato nuevo te haría cambiar tu recomendación?</p></>}<p>Esta devolución comprueba los pasos de la actividad; no califica automáticamente la calidad de tu reflexión.</p></div>}
 <small>Adaptación didáctica del caso del curso. Progreso de esta sesión: se reinicia al recargar. No registra asistencia, entregas ni aprobación.</small>
 </section>;
}
