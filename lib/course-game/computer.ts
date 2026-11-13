import {safeResourceUrl,type BoardContent} from './board';
/** Shared desktop resources; access to the source lesson is checked by the server. */
export function computerContent(lesson:BoardContent):BoardContent {
 const links=lesson.resources.filter(r=>safeResourceUrl(r.url));
 const recording=links.find(r=>r.id==='recording'||/grabaci[oó]n/i.test(r.title));
 const live=links.find(r=>r!==recording&&(r.id==='live'||/en vivo|google meet/i.test(r.title)));
 const slides=links.find(r=>r!==recording&&r!==live&&/diapositivas|presentaci[oó]n/i.test(r.title));
 return {title:lesson.title,description:lesson.description,resources:[
  ...(live?[{...live,id:'live',title:'Clase en vivo'}]:[]),
  ...(recording?[{...recording,id:'recording',title:'Grabación'}]:[]),
  ...(slides?[{...slides,id:'slides',title:'Diapositivas'}]:[]),
  ...links.filter(r=>r!==live&&r!==recording&&r!==slides),
 ]};
}
