"use client";

import { useState } from "react";
import { getDeliveryDownloadUrl } from "@/lib/actions";
import { Button, useToast } from "@/components/ui";

export default function DownloadButtonClient({ deliveryId }: { deliveryId: string }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { notify } = useToast();

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const result = await getDeliveryDownloadUrl(id);
      if (result.success && result.url) {
        window.open(result.url, '_blank');
      } else {
        notify({ title: "No se pudo descargar la entrega", description: result.error, tone: "error", duration: null });
      }
    } catch (err) {
      console.error(err);
      notify({ title: "Error al descargar la entrega", description: "Intentá nuevamente.", tone: "error", duration: null });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Button
      onClick={() => handleDownload(deliveryId)}
      isPending={downloadingId === deliveryId}
      pendingLabel="Preparando descarga…"
      leadingIcon={<span className="material-symbols-outlined text-lg">download</span>}
      className="w-full"
    >
      Descargar Entrega (ZIP)
    </Button>
  );
}
