import { NODO_ENTRANCE } from '@/lib/course-game/neighborhood';
vi.mock('./useGameSchedule', () => ({ useGameSchedule: () => ({ clock: null, isOpen: () => true }) }));
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CourseMissionMap from './CourseMissionMap';
import type { CourseGameView } from '@/lib/course-game/model';
import type { VillageState } from './phaser/village-engine';
const engine = vi.hoisted(() => ({ current: null as VillageState | null }));
vi.mock('./PhaserVillage', () => ({ default: (props: VillageState) => { engine.current = props; return <div data-testid="landscape" data-paused={props.paused} />; } }));
const game: CourseGameView = { courseId: 'pilot', courseTitle: 'Cohorte 2', title: 'Valle de las Ideas', introduction: 'Una aldea, muchas preguntas.', completed: 0, missions: [], places: [
  { id: 'one', name: 'La plaza', title: 'Clase 1', date: '2026-11-10T23:00:00Z', href: '/estudiantes/cursos/pilot/clases/one' },
  { id: 'two', name: 'La biblioteca', title: 'Clase 2', date: '', href: '/estudiantes/cursos/pilot/clases/two' },
] };
describe('aula inmersiva', () => {
  it('ofrece salida y aula clásica, cierra con Escape y restaura foco y scroll', async () => {
    const user = userEvent.setup();
    document.body.style.overflow = 'auto';
    const view = render(<CourseMissionMap game={game} />);
    expect(document.body.style.overflow).toBe('hidden');
    const trigger = screen.getByRole('button', { name: 'Menú' });
    await user.click(trigger);
    const menu = screen.getByRole('dialog', { name: 'Menú del aula' });
    expect(within(menu).getByRole('link', { name: /Volver a Epixum/ })).toHaveAttribute('href', 'https://www.epixum.com');
    expect(within(menu).getByRole('link', { name: /Abrir aula clásica/ })).toHaveAttribute('href', '/estudiantes/cursos/pilot?vista=clasica');
    fireEvent(menu, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    view.unmount();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
  it('suspende el entorno en paneles y recupera la opción de animación al cerrar', async () => {
    const user = userEvent.setup();
    render(<CourseMissionMap game={game} />);
    await user.click(screen.getByRole('button', { name: 'Menú' }));
    await user.click(screen.getByRole('button', { name: 'Activar animaciones' }));
    expect(screen.getByTestId('landscape')).toHaveAttribute('data-paused', 'true');
    await user.click(screen.getByRole('button', { name: 'Cerrar y volver al juego' }));
    expect(screen.getByTestId('landscape')).toHaveAttribute('data-paused', 'false');
    await user.click(screen.getByRole('button', { name: 'Menú' }));
    await user.click(screen.getByRole('button', { name: /Misiones/ }));
    expect(screen.getByTestId('landscape')).toHaveAttribute('data-paused', 'true');
    expect(screen.getByText('Pronto habrá nuevas misiones')).toBeVisible();
  });
  it('reúne todas las clases en el Nodo y permite entrar con teclado', async () => {
    const user = userEvent.setup();
    const places = Array.from({length: 10}, (_, i) => ({...game.places[0], id:String(i), title:'Clase '+(i+1), href:'/clases/'+i}));
    const loadBoard = vi.fn().mockResolvedValue({success:true,content:{title:'Clase 10',description:'<p>Lectura diez</p>',resources:[]}});
    render(<CourseMissionMap game={{...game, places}} loadBoard={loadBoard} />);
    const entrance = screen.getByRole('button', {name: /Entrar al Nodo Tecnológico/});
    entrance.focus(); await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Mapa del valle')).toBeInTheDocument();
    expect(engine.current?.destination?.()).toEqual(NODO_ENTRANCE);
    act(()=>engine.current?.onEnter?.());
    expect(screen.getByLabelText('Interior del Nodo')).toBeInTheDocument();
    expect(screen.getAllByRole('button',{name:/Entrar al aula/})).toHaveLength(8);
    await user.click(screen.getByRole('button',{name:'Ala siguiente →'}));
    await user.click(screen.getByRole('button',{name:'Entrar al aula 10: Clase 10'}));
    expect(screen.getByLabelText('Interior del Nodo')).toBeInTheDocument();
    expect(engine.current?.destination?.()).toEqual({x:171,y:700});
    act(()=>engine.current?.onRoom?.(1));
    expect(screen.queryByRole('heading',{name:'Aula 10'})).not.toBeInTheDocument();
    expect(screen.getByLabelText('Interior del aula')).toBeVisible();
    await user.click(screen.getByRole('button',{name:'← Volver al pasillo'}));
    await user.click(screen.getByRole('button',{name:'Menú'}));
    await user.click(screen.getByRole('button',{name:/Encuentros/}));
    const panel = screen.getByRole('dialog', {name:'Clases en el Nodo'});
    expect(within(panel).getAllByRole('button', {name:/Ver materiales/})).toHaveLength(10);
    await user.click(within(panel).getByRole('button',{name:/Ver materiales Clase 10/}));
    expect(await screen.findByText('Lectura diez')).toBeVisible();
    expect(loadBoard).toHaveBeenCalledWith('9');
    fireEvent(panel, new Event('cancel', {cancelable:true}));
    expect(screen.getByRole('button',{name:'Menú'})).toHaveFocus();
  });
  it('conserva progreso y filtros en los paneles de misiones y diario', async () => {
    const user = userEvent.setup();
    render(<CourseMissionMap game={{ ...game, completed: 1, missions: [
      { id: 'a', title: 'Investigar', href: '/a', state: 'approved', dueDate: '' },
      { id: 'b', title: 'Revisar', href: '/b', state: 'correction_requested', dueDate: '' },
    ] }} />);
    await user.click(screen.getByRole('button', { name: 'Menú' }));
    await user.click(screen.getByRole('button', { name: /Misiones/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'complete');
    expect(screen.getByText('Investigar')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Revisar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar y volver al juego' }));
    await user.click(screen.getByRole('button', { name: 'Menú' }));
    await user.click(screen.getByRole('button', { name: /Mi diario/ }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  });
});
