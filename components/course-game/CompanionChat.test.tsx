import {act,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {CompanionChat,companionAnswer,dialoguePages} from './CompanionChat';
beforeEach(()=>vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('conversación con el perro robot',()=>{
  it('muestra el nombre elegido para la mascota',()=>{
    render(<CompanionChat petName="Chispa" courseTitle="Curso" places={[]} fresh={true} inside={false} inClass={false}/>);
    expect(screen.getByText('Chispa')).toBeInTheDocument();
  });
  it('revela letras, completa con el primer clic y avanza solo con el segundo',()=>{
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
    const view=render(<CompanionChat courseTitle="Curso" places={[]} fresh={true} inside={false} inClass={false}/>);
    expect(screen.getByTestId('dialogue-visible-text').textContent).toBe('');
    act(()=>vi.advanceTimersByTime(84));
    expect(screen.getByTestId('dialogue-visible-text').textContent).toBe('¡Ho');
    fireEvent.click(screen.getByRole('log'));
    expect(screen.getByTestId('dialogue-visible-text')).toHaveTextContent('¡Hola!');
    fireEvent.click(screen.getByRole('button',{name:'¿Cómo jugar?'}));
    act(()=>vi.advanceTimersByTime(56));
    expect(screen.getByTestId('dialogue-visible-text').textContent).toBe('Ha');
    fireEvent.click(screen.getByRole('log'));
    const first=screen.getByTestId('dialogue-visible-text').textContent;
    expect(first).toContain('WASD');
    act(()=>vi.advanceTimersByTime(56));
    expect(screen.getByTestId('dialogue-visible-text').textContent).toBe(first);
    fireEvent.click(screen.getByRole('log'));
    expect(screen.getByTestId('dialogue-visible-text').textContent).toBe('');
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Enter'});
    expect(screen.getByTestId('dialogue-visible-text')).toHaveTextContent('me aparto');
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('muestra el texto inmediatamente con movimiento reducido',()=>{
    render(<CompanionChat courseTitle="Curso" places={[]} fresh={true} inside={false} inClass={false}/>);
    expect(screen.getByTestId('dialogue-visible-text')).toHaveTextContent('¡Hola!');
    expect(screen.queryByRole('button',{name:/Mostrar texto completo/})).not.toBeInTheDocument();
  });
  it('responde preguntas sugeridas y escritas, y no inventa respuestas fuera de alcance',()=>{
    render(<CompanionChat courseTitle="Curso de pensamiento crítico" places={[]} fresh={false} inside={false} inClass={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'¿Cómo jugar?'}));
    expect(screen.getByRole('log')).toHaveTextContent('WASD');
    while(screen.queryByRole('button',{name:/Continuar/})) fireEvent.click(screen.getByRole('button',{name:/Continuar/}));
    fireEvent.click(screen.getByRole('button',{name:/Otra pregunta/}));
    fireEvent.change(screen.getByLabelText('Tu pregunta'),{target:{value:'¿Cuándo abren las aulas?'}});
    fireEvent.submit(screen.getByLabelText('Tu pregunta').closest('form')!);
    expect(screen.getByRole('log')).toHaveTextContent('no puedo confirmar los horarios');
    expect(companionAnswer('¿Qué nota obtuve?','Curso',[],true,false,false)).toContain('No tengo una respuesta');
  });
  it('pagina respuestas, permite continuar con Enter y cerrar con Escape',()=>{
    const close=vi.fn();
    render(<CompanionChat courseTitle="Curso" places={[]} fresh={true} inside={true} inClass={false} onClose={close}/>);
    fireEvent.click(screen.getByRole('button',{name:'¿De qué trata el curso?'}));
    expect(screen.getByRole('button',{name:/Continuar/})).toBeVisible();
    const before=screen.getByRole('log').textContent;
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Enter'});
    expect(screen.getByRole('log').textContent).not.toBe(before);
    fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));
    expect(close).toHaveBeenCalledTimes(1);
    const text='Una explicación larga del curso. '.repeat(30);
    expect(dialoguePages(text).every(page=>page.length<=230)).toBe(true);
    expect(dialoguePages(text).join(' ')).toBe(text.trim());
  });
  it('presenta las fechas recibidas en horario argentino',()=>{
    expect(companionAnswer('horarios','Curso',[{id:'a',title:'Clase real',date:'2026-11-10T23:00:00Z',name:'Nodo',href:'#'}],true,true,false)).toContain('Clase real: 10/11/2026, 20:00:00');
  });
});
