"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

export default function CourseAdminNavigation({ courseId, surveysEnabled = false, onboardingEnabled = false, interactiveClassesEnabled = false, preparationEnabled = false, examsEnabled = false }: { courseId: string; surveysEnabled?: boolean; onboardingEnabled?: boolean; interactiveClassesEnabled?: boolean; preparationEnabled?: boolean; examsEnabled?: boolean }) {
  const pathname = usePathname();
  const base = `/admin/courses/${courseId}`;
  return <Tabs label="Administrar curso" items={[
    { href: base, label: "Configuración", icon: "tune", isActive: pathname === base },
    { href: `${base}/participants`, label: "Participantes", icon: "groups", isActive: pathname.startsWith(`${base}/participants`) },
    { href: `${base}/bedels`, label: "Bedeles", icon: "visibility", isActive: pathname.startsWith(`${base}/bedels`) },
    { href: `${base}/access`, label: "Acceso", icon: "key", isActive: pathname.startsWith(`${base}/access`) },
    ...(surveysEnabled ? [{ href: `${base}/encuestas`, label: "Encuestas", icon: "poll", isActive: pathname.startsWith(`${base}/encuestas`) }] : []),
    ...(examsEnabled ? [{ href: `${base}/parciales`, label: "Parciales", icon: "assignment", isActive: pathname.startsWith(`${base}/parciales`) }] : []),
    ...(preparationEnabled ? [{ href: `${base}/preparacion`, label: "Simulaciones de examen", icon: "quiz", isActive: pathname.startsWith(`${base}/preparacion`) }] : []),
    ...(onboardingEnabled ? [{ href: `${base}/onboarding`, label: "Onboarding", icon: "checklist", isActive: pathname.startsWith(`${base}/onboarding`) }] : []),
    ...(interactiveClassesEnabled ? [{ href: `${base}/asistencia`, label: "Asistencia", icon: "fact_check", isActive: pathname.startsWith(`${base}/asistencia`) }] : []),
  ]} />;
}
