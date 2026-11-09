import { expect,it } from 'vitest';
import { INITIAL_SOFIA, SOFIA_ACTIONS, SOFIA_QUESTIONS, sofiaFeedback, sofiaHint } from './sofia';
it('exige investigar y comparar tiempos antes de completar',()=>{
 expect(sofiaFeedback(INITIAL_SOFIA).length).toBeGreaterThan(0);
 const valid={...INITIAL_SOFIA,clues:Object.keys(SOFIA_QUESTIONS),available:'6',needed:'12',verdict:'adaptar',actions:SOFIA_ACTIONS.slice(0,2),reflection:'Primero revisaría qué temas domina y priorizaría con Sofía los que más necesita practicar.'};
 expect(sofiaFeedback(valid)).toEqual([]);
 expect(sofiaFeedback({...valid,clues:[]})).toHaveLength(1);
 expect(sofiaFeedback({...valid,actions:[...valid.actions,SOFIA_ACTIONS[2]]})).toHaveLength(1);
 expect(sofiaFeedback({...valid,available:'12'})).toHaveLength(1);
});
it('ofrece pistas graduales y cambia de investigación a revisión',()=>{
 expect(sofiaHint(INITIAL_SOFIA,0)).not.toBe(sofiaHint(INITIAL_SOFIA,1));
 expect(sofiaHint(INITIAL_SOFIA,3)).toBe(sofiaHint(INITIAL_SOFIA,2));
 expect(sofiaHint({...INITIAL_SOFIA,clues:Object.keys(SOFIA_QUESTIONS)},0)).toContain('cuenta');
});
