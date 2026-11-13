import {expect,it} from 'vitest';
import {computerContent} from './computer';

it('conserva el encuentro y sus materiales sin inventar enlaces',()=>{
 const guide={id:'guide',title:'Guía de análisis',url:'https://example.org/guide',file:false,filename:''};
 const lesson={title:'Clase 6 · Datos',description:'Caso y consignas',resources:[guide]};
 expect(computerContent(lesson)).toEqual(lesson);
 expect(computerContent({...lesson,resources:[]} ).resources).toEqual([]);
 expect(computerContent({...lesson,resources:[{...guide,url:'javascript:alert(1)'}]}).resources).toEqual([]);
});
