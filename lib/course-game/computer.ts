import {safeResourceUrl,type BoardContent} from './board';
/** Shared desktop resources; access to the source lesson is checked by the server. */
export function computerContent(lesson:BoardContent):BoardContent {
 const links=lesson.resources.filter(r=>safeResourceUrl(r.url));
 const recording=links.find(r=>r.id==='recording'||/grabaci[oó]n/i.test(r.title));
 const live=links.find(r=>r!==recording&&(r.id==='live'||/en vivo|google meet/i.test(r.title)));
 return {title:'Clase 1',description:'',resources:[
  ...(live?[{...live,id:'live',title:'Clase en vivo'}]:[]),
  ...(recording?[{...recording,id:'recording',title:'Grabación'}]:[]),
  {id:'slides',title:'Diapositivas',url:'https://google.com',file:false,filename:''},
 ]};
}
