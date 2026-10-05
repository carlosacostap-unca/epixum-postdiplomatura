"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

export default function CourseAdminNavigation({ courseId, onboardingEnabled = false, interactiveClassesEnabled = false }: { courseId: string; onboardingEnabled?: boolean; interactiveClassesEnabled?: boolean }) {
  const pathname = usePathname();
  const base = `/admin/courses/${courseId}`;
  return <Tabs label="Administrar curso" items={[
    { href: base, label: "Configuración", icon: "tune", isActive: pathname === base },
    { href: `${base}/participants`, label: "Participantes", icon: "groups", isActive: pathname.startsWith(`${base}/participants`) },
    { href: `${base}/access`, label: "Acceso", icon: "key", isActive: pathname.startsWith(`${base}/access`) },
    ...(onboardingEnabled ? [{ href: `${base}/onboarding`, label: "Onboarding", icon: "checklist", isActive: pathname.startsWith(`${base}/onboarding`) }] : []),
    ...(interactiveClassesEnabled ? [{ href: `${base}/asistencia`, label: "Asistencia", icon: "fact_check", isActive: pathname.startsWith(`${base}/asistencia`) }] : []),
  ]} />;
}
