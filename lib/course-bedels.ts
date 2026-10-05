import { z } from 'zod';
import type { Course } from '@/types';

export const courseBedelSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresá el nombre.').max(120),
  lastName: z.string().trim().min(1, 'Ingresá el apellido.').max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Ingresá un email válido.')),
});

export interface CourseBedel {
  id: string;
  course: string;
  firstName: string;
  lastName: string;
  email: string;
  expand?: { course?: Course };
}

export type BedelInput = z.infer<typeof courseBedelSchema>;
