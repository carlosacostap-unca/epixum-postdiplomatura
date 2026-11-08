import { expect, it } from 'vitest';
import { CHARACTER_OPTIONS, DEFAULT_CHARACTER, characterSchema } from './onboarding';

it('adapta personajes antiguos o enviados al servidor al catálogo elegido',()=>{
  expect(characterSchema.parse({...DEFAULT_CHARACTER,body:'mujer',beard:'completa',hair:'pelado'})).toMatchObject({body:'mujer',beard:'ninguna',hair:'largo'});
  for(const outfit of ['vestido','falda','blusa']) {
    expect(characterSchema.parse({...DEFAULT_CHARACTER,outfit,hair:'coleta'})).toMatchObject({body:'hombre',outfit:'camisa',hair:'corto'});
  }
});
it.each(['hombre','mujer'] as const)('conserva cada opción válida para %s y los datos ajenos al aspecto',body=>{
  for(const [key,values] of Object.entries(CHARACTER_OPTIONS[body])) for(const value of values) {
    const character={...DEFAULT_CHARACTER,body,[key]:value,petName:'Chispa',skin:'oscura'};
    expect(characterSchema.parse(character)).toMatchObject({[key]:value,petName:'Chispa',skin:'oscura'});
  }
});
