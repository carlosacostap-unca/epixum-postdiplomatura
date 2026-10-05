'use client';
import RoleRouteError from '@/components/shell/RoleRouteError';
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RoleRouteError error={error} reset={reset} workspace="Bedelía" />;
}
