import { beforeEach, describe, expect, it, vi } from 'vitest';
import type PocketBase from 'pocketbase';
import { readBoardContent } from './board-service';
const access=vi.hoisted(()=>vi.fn());
vi.mock('./service',()=>({authorizeCourseGame:access}));
function fixture(patch={}) {
  const links=vi.fn().mockResolvedValue([
    {id:'visible',class:'c',title:'Público',url:'https://example.com/doc.pdf'},
    {id:'private',class:'c',title:'Privado',audience:'teachers'},
    {id:'draft',class:'c',publicationStatus:'draft'},
    {id:'other',class:'another'},
    {id:'ambiguous',class:'c',assignment:'a'},
  ]);
  const getOne=vi.fn().mockResolvedValue({id:'c',course:'course',date:'2020-01-01T12:00:00Z',title:'Clase',description:'<p>Texto real</p>',...patch});
  const pb={filter:(q:string)=>q,collection:(name:string)=>name==='classes'?{getOne}:{getFullList:links}} as unknown as PocketBase;
  return {pb,links,getOne};
}
beforeEach(()=>access.mockResolvedValue({course:{id:'course'}}));
describe('lectura de pizarra',()=>{
  it('rechaza falta de matrícula antes de consultar clases',async()=>{
    access.mockResolvedValue(null); const f=fixture();
    await expect(readBoardContent(f.pb,'course','c')).rejects.toThrow();
    expect(f.getOne).not.toHaveBeenCalled();
  });
  it.each([{date:'2099-01-01T12:00:00Z'},{date:''},{date:'invalid'},{course:'other'},{publicationStatus:'draft'},{publicationStatus:'scheduled',publishAt:'2099-01-01'}])('no filtra contenido oculto o de otro curso: %j',async patch=>{
    const f=fixture(patch); await expect(readBoardContent(f.pb,'course','c')).rejects.toThrow(); expect(f.links).not.toHaveBeenCalled();
  });
  it('devuelve descripción y solo recursos públicos del padre correcto',async()=>{
    const f=fixture(); const data=await readBoardContent(f.pb,'course','c');
    expect(data.description).toBe('<p>Texto real</p>'); expect(data.resources.map(r=>r.id)).toEqual(['visible']);
    expect(data.resources[0]).not.toHaveProperty('audience');
  });
  it('propaga fallos sin fingir contenido vacío',async()=>{
    const f=fixture();f.links.mockRejectedValue(new Error('Offline'));
    await expect(readBoardContent(f.pb,'course','c')).rejects.toThrow('Offline');
  });
});
