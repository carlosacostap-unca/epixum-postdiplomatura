import type { Delivery } from '@/types';
import { getStudentDeliveryState, getTeacherDeliveryState } from './delivery-workflow';

export type DeliveryBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

const studentCopy = {
  pending: { label: 'Entrega registrada', tone: 'info' as const },
  resubmitted: { label: 'Reenviado · pendiente de revisión', tone: 'warning' as const },
  correction_requested: { label: 'Corrección solicitada', tone: 'warning' as const },
  approved: { label: 'Evaluado · aprobado', tone: 'success' as const },
  rejected: { label: 'Evaluado · desaprobado', tone: 'error' as const },
};

const teacherCopy = {
  pending: { label: 'Sin evaluar', tone: 'warning' as const },
  resubmitted: { label: 'Reenviado', tone: 'warning' as const },
  draft: { label: 'Borrador', tone: 'info' as const },
  correction_requested: { label: 'Corrección solicitada', tone: 'warning' as const },
  approved: { label: 'Aprobado', tone: 'success' as const },
  rejected: { label: 'Desaprobado', tone: 'error' as const },
};

export function studentDeliveryPresentation(delivery: Delivery) {
  return studentCopy[getStudentDeliveryState(delivery)];
}

export function teacherDeliveryPresentation(delivery: Delivery) {
  return teacherCopy[getTeacherDeliveryState(delivery)];
}
