import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import example from '@/public/interactive-class-example.json';
import { parseInteractiveMaterial } from '@/lib/interactive-material';
import { SimulationRoom } from './SimulationRoom';
import { ContentWindow } from './ContentWindow';
import { LiveRoomView } from './LiveRoomView';
import { createSimulation, joinSimulation, SIMULATION_CODE, simulationCommand, simulationTeacherState } from '@/lib/interactive-simulation';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mockPopup() {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const popup = iframe.contentWindow!;
  const focus = vi.spyOn(popup, 'focus').mockImplementation(() => {});
  const close = vi.spyOn(popup, 'close').mockImplementation(() => {});
  const open = vi.spyOn(window, 'open').mockReturnValue(popup);
  return { iframe, popup, focus, close, open };
}

describe('contenido en ventana secundaria', () => {
  it('proyecta sólo el contenido público y mantiene controles, identidades, resultados y soluciones en el panel docente', async () => {
    const { iframe, popup, close } = mockPopup();
    const user = userEvent.setup();
    const material = parseInteractiveMaterial(example)!;
    let model = joinSimulation(createSimulation(material, 'Clase para proyectar'), 'sim-1', SIMULATION_CODE);
    model = { ...model, students: model.students.map((s) => ({ ...s, name: 'Nombre privado del alumno' })) };
    let results = '';
    const send = vi.fn(async () => true);
    const view = () => <LiveRoomView state={simulationTeacherState(model, results)} results={results} setResults={vi.fn()} send={send} />;
    const { rerender, unmount } = render(view());
    await user.click(screen.getByRole('button', { name: 'Abrir ventana de proyección' }));
    const projection = within(popup.document.body);
    expect(popup.document.title).toBe('Clase para proyectar · Proyección');
    expect(projection.getByRole('heading', { name: 'Aprender participando' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente pantalla' })).toBeInTheDocument();
    const move = (index: number) => { model = simulationCommand(model, 'teacher', { kind: 'screen', index, revision: model.session.revision }); };
    const open = () => { model = simulationCommand(model, 'teacher', { kind: 'activity', open: true, revision: model.session.revision }); };
    move(1); rerender(view());
    expect(projection.getByText('Buscar evidencias y contrastarlas')).toBeInTheDocument();
    expect(projection.getByText('Esperá a que el docente abra la actividad.')).toBeInTheDocument();
    open();
    model = simulationCommand(model, { studentId: 'sim-1' }, { kind: 'answer', screenId: model.session.screenId, revision: model.session.revision, answer: 'a' });
    rerender(view());
    expect(projection.getByText('Actividad abierta. Respondé desde tu dispositivo.')).toBeInTheDocument();
    expect(screen.getByText(/Opción prevista/)).toBeInTheDocument();
    expect(screen.getByText(/1 de 1 participantes respondieron/)).toBeInTheDocument();
    for (const text of [/Opción prevista/, /participantes respondieron/, /Nombre privado/, /PRUEBA01/, /Respuestas · sólo docentes/]) {
      expect(projection.queryByText(text)).not.toBeInTheDocument();
    }
    expect(projection.queryByRole('button')).not.toBeInTheDocument();
    expect(projection.queryByRole('radio')).not.toBeInTheDocument();
    expect(projection.queryByRole('combobox')).not.toBeInTheDocument();
    move(2); results = 'pregunta'; rerender(view());
    expect(projection.getByRole('heading', { name: '¿Cómo preferís explorar un tema nuevo?' })).toBeInTheDocument();
    expect(screen.getByText(/1 de 1 participantes respondieron/)).toBeInTheDocument();
    move(3); open(); results = '';
    model = simulationCommand(model, { studentId: 'sim-1' }, { kind: 'answer', screenId: model.session.screenId, revision: model.session.revision, answer: 'REFLEXIÓN PRIVADA' });
    rerender(view());
    expect(screen.getByText('REFLEXIÓN PRIVADA')).toBeInTheDocument();
    expect(projection.queryByText('REFLEXIÓN PRIVADA')).not.toBeInTheDocument();
    expect(projection.queryByRole('textbox')).not.toBeInTheDocument();
    expect(projection.getByRole('heading', { name: 'Una idea para llevarte' })).toBeInTheDocument();
    model = simulationCommand(model, 'teacher', { kind: 'finish', revision: model.session.revision });
    rerender(view());
    expect(projection.getByText('La sesión finalizó.')).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
    unmount(); expect(close).toHaveBeenCalled(); iframe.remove();
  });

  it('explica el bloqueo del navegador y permite reintentar sin perder la clase', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    render(<ContentWindow title="Clase"><p>Contenido</p></ContentWindow>);
    await user.click(screen.getByRole('button', { name: 'Abrir sólo el contenido en una ventana nueva' }));
    expect(screen.getByRole('alert')).toHaveTextContent('navegador bloqueó');
    expect(screen.getByRole('button', { name: 'Abrir sólo el contenido en una ventana nueva' })).toBeEnabled();
  });

  it('sincroniza pantallas y respuestas desde la ventana del alumno sin mostrar controles ni soluciones docentes', async () => {
    const { iframe, popup, close, open, focus } = mockPopup();
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const user = userEvent.setup();
    const { unmount } = render(<SimulationRoom material={parseInteractiveMaterial(example)!} title="Clase de ensayo" />);
    const teacher = within(screen.getByRole('region', { name: 'Vista docente' }));
    const pupil = within(screen.getByRole('region', { name: 'Vista del alumno' }));
    expect(teacher.queryByRole('button', { name: /ventana nueva/ })).not.toBeInTheDocument();
    await user.type(pupil.getByRole('textbox', { name: 'Código de prueba' }), 'PRUEBA01');
    await user.click(pupil.getByRole('button', { name: 'Entrar como alumno' }));
    await user.click(pupil.getByRole('button', { name: 'Abrir sólo el contenido en una ventana nueva' }));
    const content = within(popup.document.body);
    expect(content.getByRole('heading', { name: 'Aprender participando' })).toBeInTheDocument();
    expect(content.getByText('Simulación · alumno ficticio')).toBeInTheDocument();
    expect(content.queryByText('PRUEBA01')).not.toBeInTheDocument();
    expect(content.queryByRole('button', { name: 'Siguiente pantalla' })).not.toBeInTheDocument();
    await user.click(pupil.getByRole('button', { name: 'Volver a la ventana de contenido' }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(2);
    await user.click(teacher.getByRole('button', { name: 'Siguiente pantalla' }));
    expect(content.getByRole('radio', { name: 'Buscar evidencias y contrastarlas' })).toBeDisabled();
    expect(content.queryByText(/Opción prevista/)).not.toBeInTheDocument();
    await user.click(teacher.getByRole('button', { name: 'Abrir respuestas' }));
    fireEvent.click(content.getByRole('radio', { name: 'Buscar evidencias y contrastarlas' }));
    await act(async () => { fireEvent.submit(content.getByRole('button', { name: 'Enviar respuesta' }).closest('form')!); });
    expect(teacher.getByText(/1 de 1 participantes respondieron/)).toBeInTheDocument();
    expect(pupil.getByText(/Tu respuesta quedó guardada/)).toBeInTheDocument();
    expect(content.getByText(/Tu respuesta quedó guardada/)).toBeInTheDocument();
    await user.click(teacher.getByRole('button', { name: 'Siguiente pantalla' }));
    expect(content.getByRole('radio', { name: 'Ver ejemplos' })).toBeDisabled();
    expect(content.queryByText(/Tu respuesta quedó guardada/)).not.toBeInTheDocument();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(teacher.getByRole('button', { name: 'Finalizar ensayo' }));
    expect(content.getByText('El ensayo terminó.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    unmount();
    expect(close).toHaveBeenCalled();
    iframe.remove();
  });

  it('permite volver a abrir tras cerrar la ventana y la cierra al salir de la clase original', async () => {
    const { iframe, popup, open, close } = mockPopup();
    const user = userEvent.setup();
    const { unmount } = render(<ContentWindow title="Clase"><p>Contenido</p></ContentWindow>);
    await user.click(screen.getByRole('button', { name: /ventana nueva/ }));
    act(() => { popup.dispatchEvent(new Event('pagehide')); });
    await user.click(screen.getByRole('button', { name: /ventana nueva/ }));
    expect(open).toHaveBeenCalledTimes(2);
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(close).toHaveBeenCalled();
    unmount(); iframe.remove();
  });
});
