"use client";

import { useState } from "react";
import { getResourceDownloadUrl } from "@/lib/actions";
import { Link as LinkType } from "@/types";

interface StudentTpResourcesProps {
  links: LinkType[];
}

export default function StudentTpResources({ links }: StudentTpResourcesProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const isFileResource = (link: LinkType) =>
    link.type === "file" ||
    link.url.includes("idrivee2.com") ||
    link.url.includes("epixum-javascript-storage");

  const handleResourceClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    link: LinkType
  ) => {
    if (!isFileResource(link)) return;

    event.preventDefault();
    setDownloadingId(link.id);

    try {
      const result = await getResourceDownloadUrl(link.id);
      if (result.success && result.url) {
        window.open(result.url, "_blank");
      } else {
        alert(result.error || "No se pudo descargar el archivo.");
      }
    } catch {
      alert("Error al descargar el archivo.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {links.map((link) => {
        const isFile = isFileResource(link);

        return (
          <a
            key={link.id}
            href={isFile ? "#" : link.url}
            target={isFile ? undefined : "_blank"}
            rel={isFile ? undefined : "noopener noreferrer"}
            onClick={(event) => handleResourceClick(event, link)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-container)] transition-colors group"
          >
            <span
              className={`material-symbols-outlined text-[20px] shrink-0 ${
                isFile ? "text-[var(--color-primary)]" : "text-blue-400"
              }`}
            >
              {isFile ? "description" : "link"}
            </span>
            <span className="text-sm font-medium text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors flex-1 truncate">
              {downloadingId === link.id ? "Descargando..." : link.title}
            </span>
            <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)] shrink-0">
              {downloadingId === link.id
                ? "hourglass_empty"
                : isFile
                  ? "download"
                  : "open_in_new"}
            </span>
          </a>
        );
      })}
    </div>
  );
}
