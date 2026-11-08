'use client';
import Link from 'next/link';

export default function AdventureError({ retry }: { retry: () => void }) {
  return <div role="alert" className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-stone-800">
    <h2 className="text-xl font-semibold">No pudimos abrir el valle</h2>
    <p className="my-4">No se pudo consultar el curso o tu progreso. Intentá nuevamente.</p>
    <button type="button" onClick={retry} className="rounded-lg bg-emerald-900 px-5 py-3 text-white">Reintentar</button>
    <Link href="https://www.epixum.com" className="ml-4 underline">Volver a Epixum</Link>
  </div>;
}
