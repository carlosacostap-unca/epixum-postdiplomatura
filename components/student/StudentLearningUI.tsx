import Link from "next/link";
import type { ReactNode } from "react";
import FormattedDate from "@/components/FormattedDate";
import { Badge } from "@/components/ui";
import type { Inquiry } from "@/types";

export function StudentIcon({ name }: { name: string }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }
export function StudentPanel({ title, children, action, id }: { title: string; children: ReactNode; action?: ReactNode; id?: string }) {
  return <section id={id} className="student-panel" aria-label={title}><div className="student-section-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}
export interface StudentNextAction { href: string; title: string; label: string; course?: string; date?: string; icon: string; action?: string }
export function StudentAction({ item }: { item: StudentNextAction }) {
  return <section className="student-next-action" aria-label="Tu próximo paso"><div><p className="student-eyebrow">{item.label}</p><h2>{item.title}</h2>{item.course && <p className="student-secondary">{item.course}</p>}{item.date && <p className="student-secondary"><StudentIcon name="event" /><FormattedDate date={item.date} showTime /></p>}</div><Link href={item.href} className="student-button student-button-primary">{item.action || "Continuar"}<StudentIcon name="arrow_forward" /></Link></section>;
}
export function StudentMetrics({ items }: { items: { href: string; value: number; label: string; icon: string }[] }) {
  return <section className="student-metrics" aria-label="Resumen académico">{items.map(item => <Link key={item.label} href={item.href}><StudentIcon name={item.icon} /><strong>{item.value}</strong><span>{item.label}</span></Link>)}</section>;
}
export function StudentInquiries({ inquiries }: { inquiries: Inquiry[] }) {
  return <div className="student-inquiry-list">{inquiries.length ? inquiries.map(inquiry => <Link className="student-inquiry-row" key={inquiry.id} href={`/estudiantes/cursos/${inquiry.course}/consultas/${inquiry.id}`}><StudentIcon name="chat_bubble_outline" /><div><h3>{inquiry.title}</h3><p className="student-secondary">{inquiry.expand?.course?.title || "Consulta del curso"}</p><span className="student-text-action">Ver conversación <StudentIcon name="arrow_forward" /></span></div><Badge tone="warning">Pendiente</Badge></Link>) : <p className="student-empty-text">No tenés consultas pendientes.</p>}</div>;
}
export function studentPlainText(value?: string) { return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || ""; }
