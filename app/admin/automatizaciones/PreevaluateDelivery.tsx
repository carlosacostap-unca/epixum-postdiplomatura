"use client";

import { useActionState } from "react";
import { preevaluatePendingDelivery } from "./actions";

export default function PreevaluateDelivery({ deliveryId }: { deliveryId: string }) {
  const [message, submit, pending] = useActionState(preevaluatePendingDelivery.bind(null, deliveryId), "");
  return <form action={submit}>
    <button disabled={pending} className="min-h-11 rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
      {pending ? "Preevaluando…" : "Preevaluar ahora"}
    </button>
    <p role="status" className="max-w-sm text-sm">{message}</p>
  </form>;
}
