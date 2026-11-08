// South-up display. Survey geometry below is authored north-up and rotated once.
export const WORLD_WIDTH=960, WORLD_HEIGHT=960;
export const NODO_SCALE=.65;
export const NODO_OFFSET={x:322,y:537};
export const NODO_ENTRANCE={x:460,y:668};
// The rear trigger sits on the first outdoor step, clear of the roof/sign.
export const NODO_REAR_ENTRANCE={x:460,y:573};
export const NODO_STAIRS_WIDTH=Math.ceil(116*NODO_SCALE);
export const NODO_FOOTPRINT={x:360,y:588,w:205,h:83};
export const ROADS=[
 {x:0,y:210,w:960,h:30,name:'AV. GÜEMES',tx:430,ty:220},
 {x:308,y:240,w:24,h:720,name:'AV. COLÓN',tx:310,ty:680},
 {x:490,y:0,w:24,h:210,name:'VIRGEN DEL VALLE',tx:490,ty:100},
 {x:646,y:0,w:22,h:960,name:'CASEROS',tx:648,ty:650},
 {x:820,y:0,w:20,h:960,name:'ENTRE RÍOS',tx:822,ty:650},
 {x:0,y:498,w:308,h:18,name:'SAN JUAN',tx:156,ty:503},
 {x:668,y:498,w:292,h:18,name:'LA RIOJA',tx:720,ty:503},
 {x:0,y:810,w:646,h:22,name:'MENDOZA',tx:200,ty:816},
 {x:668,y:810,w:292,h:22,name:'BUENOS AIRES',tx:700,ty:816},
 {x:0,y:926,w:960,h:18,name:'FLORIDA',tx:705,ty:931},
 {x:0,y:94,w:490,h:18,name:'CONGRESAL CENTENO',tx:190,ty:99},
 {x:514,y:94,w:446,h:18,name:'PÉREZ DE ZURITA',tx:700,ty:99},
 {x:110,y:0,w:18,h:960,name:'LA PAMPA',tx:110,ty:700},
];
export const NEIGHBORHOOD_BUILDINGS: {x:number;y:number;w:number;h:number}[]=[];
// Neighboring parcels are illustrative; preserve the observed street-block structure.
for(const [x,y,w,h] of [[140,10,156,72],[140,128,156,66],[344,10,132,72],[344,128,132,66],[530,10,100,72],[530,128,100,66],[684,10,120,72],[684,128,120,66],[854,10,94,72],[854,128,94,66],[684,262,120,214],[854,262,94,214],[684,538,120,248],[854,538,94,248],[140,538,156,248],[12,260,82,214],[12,538,82,248],[12,10,82,72],[12,128,82,66],[140,850,156,60],[344,850,286,60],[684,850,120,60],[854,850,94,60]]) {
 for(let py=y;py<y+h-20;py+=56) for(let px=x;px<x+w-20;px+=50) NEIGHBORHOOD_BUILDINGS.push({x:px,y:py,w:Math.min(42,x+w-px),h:Math.min(43,y+h-py)});
}
// Observed public volumes west of Colón and along the south/east of the plaza.
NEIGHBORHOOD_BUILDINGS.push({x:167,y:300,w:100,h:48},{x:245,y:260,w:49,h:42},{x:352,y:460,w:34,h:100},{x:350,y:680,w:32,h:104},{x:410,y:723,w:24,h:60},{x:552,y:580,w:30,h:140},{x:597,y:580,w:27,h:198});
export const PLAZA_BEDS=[{x:430,y:435,w:28,h:43},{x:507,y:474,w:20,h:40},{x:465,y:655,w:25,h:58}];
export const BENCHES=[[464,407],[581,437],[392,620],[516,745]];
export const TREES=[[350,270],[375,315],[616,270],[365,402],[420,460],[451,490],[487,533],[536,540],[614,525],[395,585],[447,630],[510,682],[478,760],[355,795],[628,795],[161,370],[202,390],[280,442],[275,555],[704,520],[786,790],[867,520],[530,176]];
// Rotate locations, not the sprites: roofs, facades, people and text stay upright.
export const southUpPoint = (x:number,y:number) => ({x:WORLD_WIDTH-x,y:WORLD_HEIGHT-y});
for(const road of ROADS) {
 road.x=WORLD_WIDTH-road.x-road.w;road.y=WORLD_HEIGHT-road.y-road.h;
 road.tx=WORLD_WIDTH-road.tx-(road.w>road.h?road.name.length*4:0);road.ty=WORLD_HEIGHT-road.ty;
}
for(const b of [...NEIGHBORHOOD_BUILDINGS,...PLAZA_BEDS]) {b.x=WORLD_WIDTH-b.x-b.w;b.y=WORLD_HEIGHT-b.y-b.h;}
for(const p of [...BENCHES,...TREES]) {p[0]=WORLD_WIDTH-p[0];p[1]=WORLD_HEIGHT-p[1];}
export const OBSTACLES=[...NEIGHBORHOOD_BUILDINGS,...PLAZA_BEDS,...BENCHES.map(([x,y])=>({x,y:y-3,w:17,h:10})),...TREES.map(([x,y])=>({x:x-2,y:y+2,w:5,h:5}))];
