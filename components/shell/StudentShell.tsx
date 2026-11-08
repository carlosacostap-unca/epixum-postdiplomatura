"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import LogoutButton from "@/components/LogoutButton";
import ProfileModalButton from "@/components/ProfileModalButton";
import { Dialog, IconButton } from "@/components/ui";
import { roleNavigation } from "@/lib/navigation";
import type { WorkspaceAccess } from "@/lib/course-roles";
import type { User } from "@/types";

export default function StudentShell({ children, user, workspaceAccess, pocketbaseUrl }: { children: ReactNode; user: User; workspaceAccess: WorkspaceAccess; pocketbaseUrl: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const firstName = user.firstName || user.name || user.email;
  const initials = (user.name || user.email).split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const avatar = user.avatar
    ? <Image unoptimized src={`${pocketbaseUrl}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`} alt="" width={32} height={32} className="student-avatar" />
    : <span className="student-avatar" aria-hidden="true">{initials}</span>;
  const navigation = (mobile = false) => <nav aria-label={mobile ? "Navegación móvil de Estudio" : "Secciones de Estudio"} className="student-global-navigation">
    <Link href="/estudiantes" onClick={() => setMenuOpen(false)} aria-current={pathname.startsWith("/estudiantes") ? "page" : undefined}><span className="material-symbols-outlined" aria-hidden="true">local_library</span>Mis cursos</Link>
    <Link href="/interactivas" aria-label="Ingresar a clase en vivo" onClick={() => setMenuOpen(false)}><span className="material-symbols-outlined" aria-hidden="true">videocam</span>Clase en vivo</Link>
  </nav>;

  return <div className="student-workspace">
    <a href="#main-content" className="student-skip-link" onClick={event => {
      const target = mainRef.current?.querySelector<HTMLElement>(".student-page, .page-container") ?? mainRef.current?.firstElementChild;
      if (!(target instanceof HTMLElement)) return;
      event.preventDefault(); target.tabIndex = -1; target.focus(); target.scrollIntoView?.({ block: "start" });
    }}>Saltar al contenido</a>
    <header className="student-shell-header">
      <Link href="/estudiantes" className="student-brand" aria-label="Ir al inicio de Estudio"><Image src="/epixum-logo.png" alt="" width={28} height={28} style={{ width: 28, height: 28, objectFit: "contain" }} /><span>epixum<span>.</span></span><small>Campus</small></Link>
      <div className="student-shell-controls"><span className="student-space-label">Estudio</span><IconButton label="Abrir menú de navegación" variant="ghost" icon={<span className="material-symbols-outlined">menu</span>} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-haspopup="dialog" /><ProfileModalButton compact user={user} pocketbaseUrl={pocketbaseUrl}>{avatar}<span className="sr-only">Abrir mi perfil</span></ProfileModalButton><LogoutButton iconOnly className="student-logout" /></div>
    </header>
    <div className="student-shell-body">
      <aside className="student-primary-navigation" aria-label="Navegación principal"><p className="student-nav-caption">Mi espacio</p>{navigation()}
        {pathname === "/estudiantes" && <nav className="student-home-anchors" aria-label="En esta página"><p className="student-nav-caption">En esta página</p><a href="#proximos-trabajos">Próximas entregas</a><a href="#mis-consultas">Mis consultas</a></nav>}
      </aside>
      <main ref={mainRef} id="main-content" className="student-main">{children}</main>
      <div className="student-shell-profile"><ProfileModalButton user={user} pocketbaseUrl={pocketbaseUrl}>{avatar}<span><strong>{firstName}</strong><small>Estudiante</small></span></ProfileModalButton></div>
    </div>
    <Dialog open={menuOpen} onOpenChange={setMenuOpen} title="Navegación" description="Estudio">
      <div className="space-y-5 pb-5">{navigation(true)}
        {workspaceAccess.available.length > 1 && <nav aria-label="Cambiar espacio" className="student-global-navigation"><p className="student-nav-caption">Tus espacios</p>{workspaceAccess.available.map(workspace => <Link key={workspace} href={roleNavigation[workspace].homeHref} aria-current={workspace === "estudiante" ? "page" : undefined} onClick={() => setMenuOpen(false)}>{roleNavigation[workspace].workspaceLabel}</Link>)}</nav>}
        <LogoutButton className="student-logout" />
      </div>
    </Dialog>
  </div>;
}
