export const fiaCourseId = 'tceqb7atji66fmd';

export const degreeLabels = {
  tecnicatura: 'Tecnicatura Universitaria en Diseño de Software',
  ingenieria: 'Ingeniería en Informática',
  ambas: 'Ambas carreras',
};
export type FiaDegree = keyof typeof degreeLabels;

export function isFiaDegree(value: unknown): value is FiaDegree {
  return typeof value === 'string' && Object.hasOwn(degreeLabels, value);
}
