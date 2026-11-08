import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LessonBoard } from './LessonBoard';
import { BoardHtml } from './BoardHtml';
import { resourceView } from '@/lib/course-game/board';
describe('pizarra dentro del juego',()=>{
  it('muestra el texto sin navegar y explica materiales ausentes',async()=>{
    render(<LessonBoard classId="a" load={async()=>({success:true,content:{title:'Clase real',description:'<h2>Contenido publicado</h2><p>Leemos aquí.</p>',resources:[]}})}/>);
    expect(await screen.findByText('Leemos aquí.')).toBeVisible();
    expect(screen.getByText(/Todavía no hay materiales/)).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('permite reintentar una lectura fallida',async()=>{
    const load=vi.fn().mockResolvedValueOnce({success:false,error:'Sin conexión'}).mockResolvedValueOnce({success:true,content:{title:'Recuperada',description:'',resources:[]}});
    render(<LessonBoard classId="a" load={load}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));
    expect(await screen.findByText('Recuperada')).toBeVisible();
  });
  it('descarta una respuesta tardía después de cambiar de clase',async()=>{
    let finish:(value:unknown)=>void=()=>{};
    const load=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({success:true,content:{title:'Nueva',description:'',resources:[]}});
    const view=render(<LessonBoard classId="a" load={load}/>);
    view.rerender(<LessonBoard classId="b" load={load}/>);
    await screen.findByText('Nueva'); finish({success:true,content:{title:'Anterior',description:'',resources:[]}});
    await waitFor(()=>expect(screen.queryByText('Anterior')).not.toBeInTheDocument());
  });
  it('reconstruye formato sin scripts, eventos, formularios o URLs ejecutables',()=>{
    const {container}=render(<BoardHtml html={'<h2>Título</h2><p onclick="alert(1)">Texto <strong>clave</strong></p><script>alert(1)</script><iframe src="/profile"></iframe><a href="javascript:alert(1)">Malo</a><img src="x" onerror="alert(1)"/><form><input /></form>'}/>);
    expect(screen.getByText('clave').tagName).toBe('STRONG');
    expect(container.querySelector('script,iframe,form,input,[onclick],[onerror],img,a')).toBeNull();
  });
  it('convierte solo proveedores conocidos a visores y rechaza protocolos activos',()=>{
    const r={id:'r',title:'Video',file:false,filename:'',url:'https://youtube.com/watch?v=abcdefghijk'};
    expect(resourceView(r)).toEqual({kind:'frame',url:'https://www.youtube-nocookie.com/embed/abcdefghijk'});
    expect(resourceView({...r,url:'https://youtube.com.evil/watch?v=abcdefghijk'})?.kind).toBe('link');
    expect(resourceView({...r,url:'javascript:alert(1)'})).toBeNull();
  });
});
