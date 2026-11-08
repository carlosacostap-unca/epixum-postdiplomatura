export interface BoardResource { id:string; title:string; url:string; file:boolean; filename:string }
export interface BoardContent { title:string; description:string; resources:BoardResource[] }
export type BoardResult = {success:true; content:BoardContent} | {success:false; error:string};
export type LoadBoard = (classId:string)=>Promise<BoardResult>;
export function safeResourceUrl(value:string) {
  try { const u=new URL(value); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function resourceView(resource:BoardResource): {kind:'video'|'audio'|'image'|'frame'|'link'; url:string} | null {
  const url=safeResourceUrl(resource.url); if(!url) return null;
  const u=new URL(url), name=resource.file ? resource.filename : u.pathname;
  if(/\.(mp4|webm)$/i.test(name)) return {kind:'video',url};
  if(/\.(mp3|wav|ogg)$/i.test(name)) return {kind:'audio',url};
  if(/\.(png|jpe?g|webp|gif)$/i.test(name)) return {kind:'image',url};
  if(/\.pdf$/i.test(name)) return {kind:'frame',url};
  if(['www.youtube.com','youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname)) {
    const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname.startsWith('/embed/')?u.pathname.split('/')[2]:u.searchParams.get('v');
    if(id && /^[\w-]{11}$/.test(id)) return {kind:'frame',url:`https://www.youtube-nocookie.com/embed/${id}`};
  }
  if(u.hostname==='docs.google.com') {
    const match=u.pathname.match(/^\/(document|presentation|spreadsheets)\/d\/([\w-]+)/);
    if(match) return {kind:'frame',url:`https://docs.google.com/${match[1]}/d/${match[2]}/preview`};
  }
  return {kind:'link',url};
}
