"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function CourseAdminNavigation({ courseId, courseTitle, outcomesEnabled = false, surveysEnabled = false, onboardingEnabled = false, interactiveClassesEnabled = false, preparationEnabled = false, examsEnabled = false }: { courseId: string; courseTitle?: string; outcomesEnabled?: boolean; surveysEnabled?: boolean; onboardingEnabled?: boolean; interactiveClassesEnabled?: boolean; preparationEnabled?: boolean; examsEnabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/admin/courses/${courseId}`;
  const items = [
    { href: base, label: "Configuración", icon: "tune", isActive: pathname === base },
    { href: `${base}/participants`, label: "Participantes", icon: "groups", isActive: pathname.startsWith(`${base}/participants`) },
    { href: `${base}/bedels`, label: "Bedeles", icon: "visibility", isActive: pathname.startsWith(`${base}/bedels`) },
    { href: `${base}/access`, label: "Acceso", icon: "key", isActive: pathname.startsWith(`${base}/access`) },
    ...(surveysEnabled ? [{ href: `${base}/encuestas`, label: "Encuestas", icon: "poll", isActive: pathname.startsWith(`${base}/encuestas`) }] : []),
    ...(outcomesEnabled ? [{ href: `${base}/resultados`, label: "Resultados de cursada", icon: "school", isActive: pathname.startsWith(`${base}/resultados`) }] : []),
    ...(examsEnabled ? [{ href: `${base}/parciales`, label: "Parciales", icon: "assignment", isActive: pathname.startsWith(`${base}/parciales`) }] : []),
    ...(preparationEnabled ? [{ href: `${base}/preparacion`, label: "Simulaciones de examen", icon: "quiz", isActive: pathname.startsWith(`${base}/preparacion`) }] : []),
    ...(onboardingEnabled ? [{ href: `${base}/onboarding`, label: "Onboarding", icon: "checklist", isActive: pathname.startsWith(`${base}/onboarding`) }] : []),
    ...(interactiveClassesEnabled ? [{ href: `${base}/asistencia`, label: "Asistencia", icon: "fact_check", isActive: pathname.startsWith(`${base}/asistencia`) }] : []),
  ];
  const groups = [
    { label: "Gestión", suffixes: ["", "/participants", "/bedels", "/access"] },
    { label: "Evaluación", suffixes: ["/parciales", "/preparacion", "/resultados"] },
    { label: "Seguimiento", suffixes: ["/onboarding", "/asistencia", "/encuestas"] },
  ].map(group => ({ label: group.label, items: group.suffixes.flatMap(suffix => items.filter(item => item.href === `${base}${suffix}`)) })).filter(group => group.items.length);
  const isActive = (href: string) => href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);

  return <nav className="admin-course-navigation" aria-label="Administrar curso">
    {courseTitle && <p className="admin-course-navigation-title">{courseTitle}</p>}
    <div className="admin-course-navigation-groups">
      {groups.map(group => <section key={group.label} aria-label={group.label}>
        <h2>{group.label}</h2>
        <ul>{group.items.map(item => <li key={item.href}><Link href={item.href} aria-label={item.label} aria-current={isActive(item.href) ? "page" : undefined}><span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span><span>{item.label === "Simulaciones de examen" ? "Simulaciones" : item.label === "Resultados de cursada" ? "Resultados" : item.label}</span></Link></li>)}</ul>
      </section>)}
    </div>
    <label className="admin-course-mobile-navigation"><span className="sr-only">Sección del curso</span>
      <select value={items.find(item => isActive(item.href))?.href || base} onChange={event => router.push(event.target.value)}>
        {groups.map(group => <optgroup key={group.label} label={group.label}>{group.items.map(item => <option key={item.href} value={item.href}>{item.label}</option>)}</optgroup>)}
      </select>
    </label>
  </nav>;
}
