import { useState } from 'react';
import { fireEvent,render,screen } from '@testing-library/react';
import { expect,it,vi } from 'vitest';
import { SofiaMission } from './SofiaMission';
import { INITIAL_SOFIA,SOFIA_QUESTIONS,SOFIA_ACTIONS } from '@/lib/course-game/sofia';
it('permite revisar, recibir devolución y corregir sin perder el borrador',()=>{
 const talk=vi.fn(),hint=vi.fn();
 function Demo(){const [p,set]=useState({...INITIAL_SOFIA,clues:Object.keys(SOFIA_QUESTIONS)});return <SofiaMission progress={p} onChange={set} onTalk={talk} onHint={hint}/>;}
 render(<Demo/>);
 fireEvent.click(screen.getByText('Revisar mi propuesta'));
 expect(screen.getByRole('status')).toHaveTextContent('Una oportunidad para revisar');
 fireEvent.change(screen.getByLabelText('Horas disponibles'),{target:{value:'6'}});
 fireEvent.change(screen.getByLabelText('Horas estimadas necesarias'),{target:{value:'12'}});
 fireEvent.click(screen.getByLabelText('Usarla como punto de partida y adaptarla'));
 for(const a of SOFIA_ACTIONS.slice(0,2))fireEvent.click(screen.getByLabelText(a));
 fireEvent.change(screen.getByLabelText('4. Tu recomendación para Sofía'),{target:{value:'Necesitamos revisar los conocimientos previos y priorizar los temas que requieren más práctica.'}});
 fireEvent.click(screen.getByText('Revisar mi propuesta'));
 expect(screen.getByRole('status')).toHaveTextContent('Recorrido de práctica completado');
 fireEvent.click(screen.getByText('Pedir una pista al perro'));expect(hint).toHaveBeenCalled();
 fireEvent.click(screen.getByText(/Conversar con Sofía/));expect(talk).toHaveBeenCalled();
});
