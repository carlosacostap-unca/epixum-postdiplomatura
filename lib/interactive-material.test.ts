import { describe, expect, it } from 'vitest';
import example from '@/public/interactive-class-example.json';
import { inspectInteractiveMaterial, isInteractiveLessonReady, parseInteractiveLessonForm, parseInteractiveMaterial } from './interactive-material';

describe('material interactivo', () => {
  it('acepta el ejemplo distribuido y los cuatro tipos de pantalla', () => {
    const result = parseInteractiveMaterial(example)!;
    expect(result.screens.map((screen) => screen.type)).toEqual(['content', 'multiple-choice', 'poll', 'short-answer']);
    expect(parseInteractiveMaterial(JSON.stringify(example))).toEqual(result);
  });
  it('rechaza versión, pantallas, opciones y soluciones inválidas', () => {
    expect(() => parseInteractiveMaterial({ ...example, version: 2 })).toThrow();
    expect(() => parseInteractiveMaterial({ version: 1, screens: [] })).toThrow(/pantalla/);
    expect(() => parseInteractiveMaterial({ version: 1, screens: [example.screens[0], example.screens[0]] })).toThrow(/repetido/);
    const choice = example.screens[1];
    expect(() => parseInteractiveMaterial({ version: 1, screens: [{ ...choice, correctOptionId: 'missing' }] })).toThrow(/correcta/);
    expect(() => parseInteractiveMaterial({ version: 1, screens: [{ ...choice, options: [{ id: 'a', label: 'A' }, { id: 'a', label: 'B' }] }] })).toThrow(/repetidos/);
    expect(() => parseInteractiveMaterial({ version: 1, screens: [{ ...example.screens[2], correctOptionId: 'ejemplos' }] })).toThrow();
  });
  it('limita cantidad, tamaño UTF-8 y respuestas breves', () => {
    expect(() => parseInteractiveMaterial({ version: 1, screens: Array.from({ length: 81 }, (_, i) => ({ ...example.screens[0], id: `s-${i}` })) })).toThrow();
    expect(() => parseInteractiveMaterial(JSON.stringify({ text: 'é'.repeat(100000) }))).toThrow(/200 KB/);
    expect(() => parseInteractiveMaterial({ version: 1, screens: [{ ...example.screens[3], maxLength: 2001 }] })).toThrow();
    expect(() => parseInteractiveMaterial('{')).toThrow(/JSON válido/);
  });
  it('permite borrador vacío y exige clase y material para preparar', () => {
    const form = new FormData();
    form.set('title', '  Clase  ');
    expect(parseInteractiveLessonForm(form)).toMatchObject({ title: 'Clase', status: 'draft', material: null });
    form.set('status', 'ready');
    expect(() => parseInteractiveLessonForm(form)).toThrow(/asociá/);
    form.set('class', 'class-1');
    expect(() => parseInteractiveLessonForm(form)).toThrow(/importá/);
    form.set('material', JSON.stringify(example));
    expect(parseInteractiveLessonForm(form).status).toBe('ready');
  });
  it('considera borrador efectivo una clase eliminada o material inválido', () => {
    expect(isInteractiveLessonReady({ status: 'ready', class: '', material: example })).toBe(false);
    expect(isInteractiveLessonReady({ status: 'ready', class: 'class-1', material: {} })).toBe(false);
    expect(inspectInteractiveMaterial('{}')).toMatchObject({ material: null, error: expect.any(String) });
  });
});
