import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {TeacherComputer} from './TeacherComputer';
it('muestra el título y los materiales del encuentro seleccionado',async()=>{
 render(<TeacherComputer classId="six" load={async()=>({success:true,content:{title:'Clase 6 · Datos',description:'',resources:[{id:'guide',title:'Guía de datos',url:'https://example.org/guide',file:false,filename:''}]}})}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Abrir carpeta Clase 6 · Datos'}));
 expect(screen.getByRole('heading',{name:'Clase 6 · Datos'})).toBeVisible();
 expect(screen.getByRole('link',{name:/Guía de datos/})).toHaveAttribute('href','https://example.org/guide');
});
it('abre una sola carpeta y ofrece los tres accesos sin salir del juego',async()=>{
 const load=vi.fn(async()=>({success:true as const,content:{title:'Clase 1',description:'',resources:[{id:'live',title:'Clase en vivo',url:'https://meet.google.com/test',file:false,filename:''},{id:'recording',title:'Grabación',url:'https://youtube.com/test',file:false,filename:''},{id:'slides',title:'Diapositivas',url:'https://google.com',file:false,filename:''}]}}));
 render(<TeacherComputer load={load} classId="one"/>);
 expect(screen.queryByRole('link')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Abrir carpeta Clase 1'}));
 expect(await screen.findByRole('link',{name:/Clase en vivo/})).toHaveAttribute('href','https://meet.google.com/test');
 expect(screen.getByRole('link',{name:/Grabación/})).toHaveAttribute('href','https://youtube.com/test');
 expect(screen.getByRole('link',{name:/Diapositivas/})).toHaveAttribute('href','https://google.com/');
 for(const link of screen.getAllByRole('link'))expect(link).toHaveAttribute('target','_blank');
 fireEvent.click(screen.getByRole('button',{name:'Escritorio'}));expect(screen.getByRole('button',{name:'Abrir carpeta Clase 1'})).toBeVisible();
});
it('muestra recursos faltantes sin inventar enlaces',async()=>{
 render(<TeacherComputer classId="one" load={async()=>({success:true,content:{title:'Clase 1',description:'',resources:[]}})}/>);
 fireEvent.click(screen.getByRole('button',{name:'Abrir carpeta Clase 1'}));
 expect(await screen.findAllByText('Enlace todavía no disponible')).toHaveLength(3);
 expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
