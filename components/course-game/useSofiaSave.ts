'use client';
import { useEffect,useRef,useState } from 'react';
import type { SaveSofia,SofiaProgress } from '@/lib/course-game/sofia';
export function useSofiaSave(progress:SofiaProgress,save?:SaveSofia) {
 const [saved,setSaved]=useState(()=>JSON.stringify(progress));
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 const active=useRef(false);
 const snapshot=JSON.stringify(progress);
 const dirty=Boolean(save && snapshot!==saved);
 useEffect(()=>{
  if(!dirty)return;
  const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return ()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 useEffect(()=>{
  if(!save || snapshot===saved || active.current)return;
  let disposed=false;
  const timer=setTimeout(async()=>{
   active.current=true;setError('');
   try {const result=await save(JSON.parse(snapshot));if(result.success)setSaved(snapshot);else setError(result.error);}
   catch {setError('No pudimos guardar. Revisá la conexión y reintentá antes de salir.');}
   finally {active.current=false;if(disposed)setRetry(n=>n+1);}
  },400);
  return ()=>{disposed=true;clearTimeout(timer);};
 },[snapshot,saved,save,retry]);
 return {dirty,error,retry:()=>{setError('');setRetry(n=>n+1);},label:!save?'Vista previa: progreso de esta sesión':error?'Sin guardar':dirty?'Guardando…':'Guardado en PocketBase'};
}
