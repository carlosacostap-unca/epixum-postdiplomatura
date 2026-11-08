type Paint=(color:number,x:number,y:number,w:number,h:number,alpha?:number)=>void;
export function drawLaptop(r:Paint,x:number,y:number,scale=1) {
  const p:Paint=(c,dx,dy,w,h)=>r(c,x+dx*scale,y+dy*scale,w*scale,h*scale);
  p(0x263e50,1,0,22,11); p(0x72bdd0,3,2,18,7);
  p(0xc6edf0,5,3,8,1); p(0x477e9a,5,6,13,1);
  p(0xa4b3b8,0,11,24,4); p(0x4d6571,3,11,18,2); p(0xd9e1dd,9,14,6,1);
}
export function drawChair(r:Paint,x:number,y:number,scale=1) {
  const p:Paint=(c,dx,dy,w,h)=>r(c,x+dx*scale,y+dy*scale,w*scale,h*scale);
  p(0x454e50,2,5,2,11); p(0x454e50,14,5,2,11);
  p(0x345764,1,3,16,7); p(0x6d9ca3,3,4,12,3);
  p(0x2f4b58,0,9,18,4); p(0x7faeb1,1,9,16,2);
}
