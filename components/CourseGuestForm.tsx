'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addCourseGuest, removeCourseGuestAccess } from '@/lib/actions-course-participants';
import { Button } from '@/components/ui';

export function RemoveGuestButton({courseId,studentId}:{courseId:string;studentId:string}) {
  const router=useRouter();
  const [pending,start]=useTransition();
  const [error,setError]=useState('');
  return <><Button variant="ghost" isPending={pending} onClick={()=>start(async()=>{
    const result=await removeCourseGuestAccess(courseId,studentId);
    if(result.status !== 'success') setError(result.message); else router.refresh();
  })}>Quitar permiso de invitado</Button>{error && <p role="alert">{error}</p>}</>;
}

export default function CourseGuestForm({courseId}:{courseId:string}) {
  const router=useRouter();
  const [email,setEmail]=useState('');
  const [feedback,setFeedback]=useState('');
  const [pending,start]=useTransition();
  return <form className="space-y-3 rounded-xl border border-[var(--color-outline)] p-4" onSubmit={event=>{
    event.preventDefault();
    start(async()=>{
      const result=await addCourseGuest(courseId,email);
      setFeedback(result.message);
      if(result.status==='success') {setEmail('');router.refresh();}
    });
  }}>
    <h3 className="font-bold">Estudiantes invitados</h3>
    <p className="text-sm">Pueden ver este curso incluso en borrador. Los demás estudiantes lo verán cuando esté publicado. Usá el correo de una cuenta registrada; también podés dar este permiso a un alumno ya matriculado.</p>
    <label htmlFor="course-guest-email" className="block text-sm font-bold">Correo del estudiante invitado</label>
    <input id="course-guest-email" type="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} disabled={pending} className="min-h-11 w-full rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4" />
    <Button type="submit" isPending={pending}>Agregar estudiante invitado</Button>
    {feedback && <p role="status">{feedback}</p>}
  </form>;
}
