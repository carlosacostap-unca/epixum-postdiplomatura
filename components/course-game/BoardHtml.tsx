'use client';
import { createElement, useMemo, type ReactNode } from 'react';
import { safeResourceUrl } from '@/lib/course-game/board';
const allowed=new Set(['p','h1','h2','h3','h4','h5','h6','strong','b','em','i','u','s','ul','ol','li','blockquote','pre','code','br','hr','table','thead','tbody','tr','th','td','span','div','sub','sup']);
const dropped=new Set(['script','style','iframe','object','embed','svg','math','form','input','button','textarea','select','link','meta','base']);
/** Rebuild editor HTML as React elements: no raw HTML, event handlers, styles or active embeds. */
export function BoardHtml({html}:{html:string}) {
  const content=useMemo(()=>{
    if(typeof DOMParser==='undefined') return null;
    const doc=new DOMParser().parseFromString(html,'text/html');
    function render(node:Node,key:number):ReactNode {
      if(node.nodeType===3) return node.textContent;
      if(node.nodeType!==1) return null;
      const el=node as Element, tag=el.tagName.toLowerCase();
      if(dropped.has(tag)) return null;
      const children=Array.from(el.childNodes).map(render);
      if(tag==='a') { const href=safeResourceUrl(el.getAttribute('href')||''); return href?createElement('a',{key,href,target:'_blank',rel:'noopener noreferrer'},children):children; }
      if(tag==='img') { const src=safeResourceUrl(el.getAttribute('src')||''); return src?createElement('img',{key,src,alt:el.getAttribute('alt')||'Imagen de la clase',loading:'lazy',referrerPolicy:'no-referrer'}):null; }
      return allowed.has(tag)?createElement(tag,{key},children):createElement('span',{key},children);
    }
    return Array.from(doc.body.childNodes).map(render);
  },[html]);
  return <div>{content}</div>;
}
