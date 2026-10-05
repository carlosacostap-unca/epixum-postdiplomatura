"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import LogoutButton from "@/components/LogoutButton";
import ProfileModalButton from "@/components/ProfileModalButton";
import { Dialog, IconButton } from "@/components/ui";
import { cx } from "@/components/ui/styles";
import type { AppWorkspace, WorkspaceAccess } from "@/lib/course-roles";
import { getNavigationForPath, isNavigationItemActive, roleNavigation } from "@/lib/navigation";
import type { User } from "@/types";

export interface AppShellProps {
  children: ReactNode;
  pocketbaseUrl: string;
  user: User;
  workspaceAccess: WorkspaceAccess;
  activeWorkspace?: AppWorkspace;
}

const workspaceIcons: Record<AppWorkspace, string> = {
  admin: "admin_panel_settings", docente: "co_present", estudiante: "school", bedel: "visibility",
};

function WorkspaceSwitcher({ access, active, onNavigate }: { access: WorkspaceAccess; active: AppWorkspace; onNavigate?: () => void }) {
  if (access.available.length < 2) return null;
  return <nav className="space-y-2" aria-label="Cambiar espacio">
    <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Tus espacios</p>
    <ul className="space-y-1">{access.available.map((workspace) => {
      const config = roleNavigation[workspace];
      const selected = workspace === active;
      return <li key={workspace}><Link href={config.homeHref} onClick={onNavigate} aria-current={selected ? "page" : undefined} className={cx("flex min-h-11 items-center gap-3 rounded-[var(--epixum-radius-md)] px-3 text-sm transition-colors", selected ? "bg-[var(--color-surface-container)] font-semibold text-[var(--color-on-surface)]" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]")}><span className="material-symbols-outlined text-xl" aria-hidden="true">{workspaceIcons[workspace]}</span>{config.workspaceLabel}{selected && <span className="material-symbols-outlined ml-auto text-base text-[var(--color-primary)]" aria-hidden="true">check</span>}</Link></li>;
    })}</ul>
  </nav>;
}

function UserAvatar({ user, pocketbaseUrl }: { user: User; pocketbaseUrl: string }) {
  const initials = [user.firstName || user.name || user.email || "U", user.lastName].filter(Boolean).join(" ").split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
  return user.avatar
    ? <Image unoptimized src={`${pocketbaseUrl}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover" />
    : <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-bold text-[var(--color-primary)]" aria-hidden="true">{initials}</span>;
}

export default function AppShell({ activeWorkspace, children, pocketbaseUrl, user, workspaceAccess }: AppShellProps) {
  const pathname = usePathname();
  const workspace = activeWorkspace ?? getNavigationForPath(pathname).workspace;
  const navigation = roleNavigation[workspace];
  const [menuOpen, setMenuOpen] = useState(false);
  const activeItem = navigation.items.find((item) => isNavigationItemActive(pathname, item));
  const closeMenu = () => setMenuOpen(false);

  function navigationLinks(mobile = false) {
    return <nav aria-label={mobile ? `Navegación móvil de ${navigation.workspaceLabel}` : `Secciones de ${navigation.workspaceLabel}`}>
      <ul className="space-y-1">{navigation.items.map((item) => {
        const active = isNavigationItemActive(pathname, item);
        return <li key={item.href}><Link href={item.href} onClick={mobile ? closeMenu : undefined} aria-current={active ? "page" : undefined} className={cx("flex min-h-12 items-center gap-3 rounded-[var(--epixum-radius-md)] px-3 text-sm font-semibold transition-colors", active ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]")}><span className="material-symbols-outlined text-xl" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{active && <span className="ml-auto size-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />}</Link></li>;
      })}</ul>
    </nav>;
  }

  return <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-on-surface)]">
    <a href="#main-content" className="fixed left-4 top-4 z-[300] -translate-y-24 rounded-xl bg-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-on-primary)] transition-transform focus:translate-y-0">Saltar al contenido</a>
    <div className="content-shell flex min-h-screen">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-variant)] px-4 py-6 lg:flex" aria-label="Navegación principal">
        <Link href={navigation.homeHref} aria-label={`Ir al inicio de ${navigation.workspaceLabel}`} className="mb-9 flex min-h-12 items-center gap-3 rounded-xl px-3">
          <Image src="/epixum-logo.png" alt="" width={36} height={36} className="size-9 object-contain" />
          <div><p className="font-headline text-xl font-bold tracking-tight">epixum<span className="text-[var(--color-primary)]">.</span></p><p className="text-xs text-[var(--color-text-muted)]">Campus virtual</p></div>
        </Link>
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto">
          <div><p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{navigation.workspaceLabel}</p>{navigationLinks()}</div>
          <WorkspaceSwitcher access={workspaceAccess} active={workspace} />
        </div>
        <div className="mt-6 space-y-2 border-t border-[var(--color-outline-variant)] pt-4">
          <ProfileModalButton user={user} pocketbaseUrl={pocketbaseUrl}><UserAvatar user={user} pocketbaseUrl={pocketbaseUrl} /><span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{user.firstName || user.name || user.email}</span><span className="block text-xs text-[var(--color-text-muted)]">Mi perfil</span></span><span className="material-symbols-outlined text-lg text-[var(--color-text-muted)]" aria-hidden="true">settings</span></ProfileModalButton>
          <LogoutButton className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-error)]" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-variant)] px-4 backdrop-blur-xl md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <IconButton label="Abrir menú de navegación" icon={<span className="material-symbols-outlined">menu</span>} variant="ghost" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-haspopup="dialog" />
            <div className="min-w-0"><p className="truncate text-xs text-[var(--color-text-muted)]">{navigation.workspaceLabel}</p><p className="truncate text-sm font-semibold">{activeItem?.label || "Inicio"}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden whitespace-nowrap text-xs text-[var(--color-text-muted)] sm:block">{workspace === "admin" ? "Gestión del campus" : workspace === "docente" ? "Tu espacio de docencia" : workspace === "bedel" ? "Cursos de solo lectura" : "Tu espacio de aprendizaje"}</span>
            <ProfileModalButton user={user} pocketbaseUrl={pocketbaseUrl} compact><UserAvatar user={user} pocketbaseUrl={pocketbaseUrl} /><span className="sr-only">Abrir mi perfil</span></ProfileModalButton>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="min-h-[calc(100dvh-4rem)] min-w-0 focus:outline-none">{children}</main>
      </div>
    </div>

    <Dialog open={menuOpen} onOpenChange={setMenuOpen} title="Navegación" description={navigation.workspaceLabel}>
      <div className="space-y-6 pb-6">
        {navigationLinks(true)}
        <WorkspaceSwitcher access={workspaceAccess} active={workspace} onNavigate={closeMenu} />
        <LogoutButton className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-error)]" />
      </div>
    </Dialog>
  </div>;
}
