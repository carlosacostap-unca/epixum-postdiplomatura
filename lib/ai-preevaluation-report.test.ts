import { describe, expect, it } from 'vitest';
import { buildAIPreevaluationFeedback } from './ai-preevaluation-report';
import { reportFixture } from '@/test/ai-preevaluation-report-fixture';

describe('informe completo para el estudiante', () => {
  it('incluye todos los criterios, observaciones, listas y evidencia sin resumirlos', () => {
    const text = buildAIPreevaluationFeedback(reportFixture);
    expect(text).toContain(reportFixture.result.proposedMessage);
    for (const criterion of reportFixture.result.criteria) {
      expect(text).toContain(criterion.criterion);
      expect(text).toContain(criterion.observation);
    }
    for (const item of [...reportFixture.result.strengths, ...reportFixture.result.corrections, ...reportFixture.result.warnings]) expect(text).toContain(item);
    expect(text).toContain('Cumple parcialmente');
    expect(text).toContain('No cumple');
    expect(text).toContain('No verificable con la evidencia disponible');
    expect(text).toContain('Layout, formularios y accesibilidad.');
    expect(text).toContain('40% (no es el puntaje obtenido)');
    expect(text).toContain('Versión de la rúbrica: 2');
    expect(text).toContain('Sugerencia inicial de la preevaluación: Corregir y reenviar. Nota sugerida: 5.');
    expect(text).toContain(reportFixture.commitSha);
    for (const path of reportFixture.coverage!.includedFiles) expect(text).toContain(path);
    expect(text).toContain('views/layout.ejs: archivo de texto fuera de límite');
    expect(text).toContain('no equivale a un archivo faltante');
    expect(text).toContain('No ejecuta, compila ni prueba');
  });

  it('explica los datos históricos no disponibles sin inventar pesos o cobertura', () => {
    const text = buildAIPreevaluationFeedback({ ...reportFixture, rubric: undefined, coverage: undefined });
    expect(text).toContain('no están disponibles en este registro');
    expect(text).toContain('No está disponible el detalle de archivos');
    expect(text).not.toContain('Peso en la rúbrica:');
    expect(text).not.toContain('views/layout.ejs:');
  });

  it('distingue recomendaciones de condiciones para un trabajo aprobado', () => {
    const text = buildAIPreevaluationFeedback({ ...reportFixture, result: { ...reportFixture.result, verdict: 'Aprobado' } });
    expect(text).toContain('MEJORAS RECOMENDADAS');
    expect(text).toContain('no implican un pedido de reenvío');
    expect(text).toContain('Asociar label e input.');
  });

  it('no serializa datos administrativos ni instrucciones privadas', () => {
    const extra = { ...reportFixture, providerResponseId: 'privado-resp', requestedBy: 'privado-docente', configSnapshot: { additionalInstructions: 'privado-prompt' }, usage: { inputTokens: 123456 } };
    const text = buildAIPreevaluationFeedback(extra);
    for (const hidden of ['privado-resp', 'privado-docente', 'privado-prompt', 'inputTokens', '123456']) expect(text).not.toContain(hidden);
  });

  it('no trunca listas extensas ni elimina sus últimos elementos', () => {
    const includedFiles = Array.from({ length: 200 }, (_, i) => `views/pagina-${i}.ejs`);
    const text = buildAIPreevaluationFeedback({ ...reportFixture, coverage: { ...reportFixture.coverage!, includedFiles } });
    expect(text).toContain('- views/pagina-199.ejs');
    expect(text.length).toBeGreaterThan(5000);
  });

  it('muestra listas vacías y pesos nulos sin inventar hallazgos', () => {
    const text = buildAIPreevaluationFeedback({ ...reportFixture, rubric: [{ ...reportFixture.rubric![0], weight: null }], result: { ...reportFixture.result, strengths: [], corrections: [], warnings: [] }, coverage: { ...reportFixture.coverage!, omittedFiles: [], partial: false } });
    expect(text).toContain('No se registraron fortalezas adicionales.');
    expect(text).toContain('No se registraron correcciones adicionales.');
    expect(text).toContain('No se registraron advertencias adicionales.');
    expect(text).toContain('No se registraron omisiones.');
    expect(text).not.toContain('Peso en la rúbrica:');
  });

  it('distingue una sugerencia sin nota de una nota cero', () => {
    const text = buildAIPreevaluationFeedback({ ...reportFixture, result: { ...reportFixture.result, suggestedGrade: null } });
    expect(text).toContain('Nota sugerida: sin nota numérica.');
  });
});
