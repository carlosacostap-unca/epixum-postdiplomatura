import { getAssignment, getCourse, getDeliveryById } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import DownloadButtonClient from './DownloadButtonClient';
import AIPreevaluationClient from './AIPreevaluationClient';
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function DeliveryDetailsPage({ params }: { params: Promise<{ id: string, deliveryId: string }> }) {
  const { id, deliveryId } = await params;
  const user = await getCurrentUser();

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    redirect('/login');
  }

  const assignment = await getAssignment(id);
  const delivery = await getDeliveryById(deliveryId);

  if (!assignment || !delivery || delivery.assignment !== assignment.id) {
    return notFound();
  }

  if (user.role === "docente") {
    if (!assignment.course) redirect("/docentes");
    const course = await getCourse(assignment.course).catch(() => null);
    if (!course?.teachers?.includes(user.id)) redirect("/docentes");
  }

  const student = delivery.expand?.student;
  const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL?.replace(/\/$/, "") || "";

  return (
    <div className="container mx-auto p-8 min-h-screen max-w-4xl">
      <Link href={user.role === "docente" && assignment.course ? `/docentes/cursos/${assignment.course}/tps/${id}#entregas` : "/admin"} className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-surface-container-highest)] px-5 text-sm font-bold hover:text-[var(--color-primary)]">
        &larr; Volver a las entregas
      </Link>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Detalles de Entrega
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Trabajo Práctico: <span className="font-medium text-zinc-700 dark:text-zinc-300">{assignment.title}</span>
            </p>
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Fecha de entrega: <FormattedDate date={delivery.created} showTime={true} />
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Student Info */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                Información del Estudiante
              </h2>
              {student ? (
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                    {student.avatar ? (
                      <Image
                        unoptimized
                        src={`${pbUrl}/api/files/${student.collectionId}/${student.id}/${student.avatar}`} 
                        alt={student.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-zinc-500 dark:text-zinc-400">
                        {student.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{student.name}</div>
                    <div className="text-zinc-500 dark:text-zinc-400">{student.email}</div>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 italic">Estudiante no encontrado</div>
              )}
            </div>

            {/* Delivery File */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                Archivo Entregado
              </h2>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]" title={delivery.repositoryUrl}>
                      {delivery.repositoryUrl || "Sin archivo"}
                    </div>
                    <div className="text-xs text-zinc-500">ZIP entregado</div>
                  </div>
                </div>
                
                <DownloadButtonClient deliveryId={delivery.id} />
              </div>
            </div>
          </div>

          {/* AI Preevaluation Section */}
          <AIPreevaluationClient 
            assignmentId={assignment.id} 
            deliveryId={delivery.id} 
            initialPrompt={assignment.systemPrompt || ''}
            initialGrade={delivery.grade}
            initialFeedback={delivery.feedback}
            initialVerdict={delivery.verdict}
            initialStatus={delivery.status}
          />
        </div>
      </div>
    </div>
  );
}
