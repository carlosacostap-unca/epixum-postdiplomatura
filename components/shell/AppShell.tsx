"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LogoutButton from "@/components/LogoutButton";
import ProfileModalButton from "@/components/ProfileModalButton";
import { cx } from "@/components/ui/styles";
import { isNavigationItemActive, roleNavigation } from "@/lib/navigation";
import type { User } from "@/types";

export interface AppShellProps {
  children: ReactNode;
  pocketbaseUrl: string;
  user: User;
}

function UserAvatar({ user, pocketbaseUrl, compact = false }: { user: User; pocketbaseUrl: string; compact?: boolean }) {
  const initials = (user.firstName || user.name || user.email || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const sizeClass = compact ? "size-9 text-xs" : "size-11 text-sm";

  if (user.avatar) {
    return (
      <Image
        unoptimized
        src={`${pocketbaseUrl}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`}
        alt=""
        width={44}
        height={44}
        className={cx(sizeClass, "rounded-full object-cover")}
      />
    );
  }

  return (
    <span
      className={cx(
        sizeClass,
        "inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] font-black text-[var(--color-on-primary)]",
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export default function AppShell({ children, pocketbaseUrl, user }: AppShellProps) {
  const pathname = usePathname();
  const navigation = roleNavigation[user.role];

  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-on-surface)]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[300] -translate-y-24 rounded-[var(--epixum-radius-pill)] bg-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-on-primary)] transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-[20%] -top-[30%] size-[60vw] rounded-full bg-[var(--color-primary)]/5 blur-[100px]" />
        <div className="absolute -bottom-[30%] -right-[20%] size-[60vw] rounded-full bg-[var(--color-tertiary)]/5 blur-[100px]" />
      </div>

      <div className="content-shell flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col px-5 py-6 lg:flex" aria-label="Navegación principal">
          <div className="flex min-h-0 flex-1 flex-col rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-variant)] p-4 shadow-[0_16px_48px_rgb(0_0_0/20%)] backdrop-blur-2xl">
            <Link
              href={navigation.homeHref}
              aria-label={`Ir al inicio de ${navigation.workspaceLabel}`}
              className="flex min-h-14 items-center gap-3 rounded-[var(--epixum-radius-lg)] px-3 hover:bg-[var(--color-surface-container)]"
            >
              <Image src="/epixum-logo.png" alt="" width={40} height={40} className="size-10 object-contain" />
              <div className="min-w-0">
                <p className="font-headline text-lg font-bold tracking-tight">Epixum</p>
                <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                  {navigation.workspaceLabel}
                </p>
              </div>
            </Link>

            <nav className="mt-8" aria-label={`Secciones de ${navigation.workspaceLabel}`}>
              <ul className="space-y-2">
                {navigation.items.map((item) => {
                  const active = isNavigationItemActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "flex min-h-12 items-center gap-3 rounded-[var(--epixum-radius-lg)] px-4 text-sm font-bold transition-colors",
                          active
                            ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                            : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]",
                        )}
                      >
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-auto space-y-2 pt-8">
              <ProfileModalButton user={user} pocketbaseUrl={pocketbaseUrl}>
                <UserAvatar user={user} pocketbaseUrl={pocketbaseUrl} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold text-[var(--color-on-surface)]">{user.name || user.email}</span>
                  <span className="block text-xs text-[var(--color-on-surface-variant)]">Mi perfil</span>
                </span>
                <span className="material-symbols-outlined text-lg text-[var(--color-on-surface-variant)]" aria-hidden="true">chevron_right</span>
              </ProfileModalButton>

              <LogoutButton className="flex min-h-12 w-full items-center gap-3 rounded-[var(--epixum-radius-lg)] px-4 text-sm font-bold text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-error)]" />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between bg-[var(--color-surface-variant)] px-4 backdrop-blur-2xl lg:hidden">
            <Link
              href={navigation.homeHref}
              aria-label={`Ir al inicio de ${navigation.workspaceLabel}`}
              className="flex min-h-11 items-center gap-3 rounded-[var(--epixum-radius-md)]"
            >
              <Image src="/epixum-logo.png" alt="" width={36} height={36} className="size-9 object-contain" />
              <div>
                <p className="font-headline font-bold leading-none">Epixum</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  {navigation.workspaceLabel}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <ProfileModalButton user={user} pocketbaseUrl={pocketbaseUrl} className="touch-target flex items-center justify-center rounded-full">
                <UserAvatar user={user} pocketbaseUrl={pocketbaseUrl} compact />
                <span className="sr-only">Abrir mi perfil</span>
              </ProfileModalButton>
              <LogoutButton
                iconOnly
                className="touch-target flex items-center justify-center rounded-full text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-error)]"
              />
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="min-h-full focus:outline-none">
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label={`Navegación móvil de ${navigation.workspaceLabel}`}
        className="fixed inset-x-3 bottom-3 z-50 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-variant)] p-2 shadow-[var(--epixum-shadow-floating)] backdrop-blur-2xl lg:hidden"
      >
        <ul className="grid grid-flow-col auto-cols-fr gap-1">
          {navigation.items.map((item) => {
            const active = isNavigationItemActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--epixum-radius-lg)] px-2 text-[11px] font-bold transition-colors",
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]",
                  )}
                >
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
