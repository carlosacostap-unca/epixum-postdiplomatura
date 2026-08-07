"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCourse } from "@/lib/actions-courses";
import { Button, ConfirmDialog, useToast } from "@/components/ui";

export default function DeleteCourseButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteCourse(id);
      notify({ title: "Curso eliminado", description: `${title} ya no está disponible.`, tone: "success" });
      router.push("/admin/courses");
      router.refresh();
    } catch (error: unknown) {
      notify({ title: "No pudimos eliminar el curso", description: error instanceof Error ? error.message : "Intentá nuevamente.", tone: "error", duration: null });
      setLoading(false);
    }
  };

  return <><Button variant="danger" onClick={() => setOpen(true)} leadingIcon={<span className="material-symbols-outlined" aria-hidden="true">delete</span>}>Eliminar curso</Button><ConfirmDialog open={open} onOpenChange={setOpen} title="Eliminar curso" description={<>Vas a eliminar <strong>{title}</strong>. Esta acción no se puede deshacer.</>} confirmLabel="Eliminar definitivamente" onConfirm={handleDelete} isPending={loading} tone="danger" /></>;
}
