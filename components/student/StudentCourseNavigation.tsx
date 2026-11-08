"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StudentCourseNavigationItem } from "@/lib/course-navigation";

export default function StudentCourseNavigation({ courseTitle, items }: { courseTitle: string; items: StudentCourseNavigationItem[] }) {
  const router = useRouter();
  return <nav className="student-course-navigation" aria-label={`Secciones de ${courseTitle}`}>
    <p className="student-nav-caption">Este curso</p><p className="student-course-nav-title">{courseTitle}</p>
    <div className="student-course-nav-links">{items.map(item => <Link key={item.href} href={item.href} aria-current={item.isActive ? "page" : undefined}><span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</div>
    <label className="student-course-mobile-navigation"><span className="sr-only">Sección del curso</span><select defaultValue={items.find(item => item.isActive)?.href} onChange={event => router.push(event.target.value)}>{items.map(item => <option key={item.href} value={item.href}>{item.label}</option>)}</select></label>
  </nav>;
}
