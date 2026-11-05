const KEY='aivm-layout-v1';
export const CONTROL_IDS=['joystick','left-fire-btn','sprint-btn','aim-btn','weapon-btn','reload-btn','interact-btn','fire-btn','reverse-btn','accelerate-btn'];
export function sanitizeLayout(data) {
  const result={portrait:{},landscape:{}};
  for(const orientation of Object.keys(result))for(const id of CONTROL_IDS){
    const p=data?.[orientation]?.[id];
    if(p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1)result[orientation][id]={x:p.x,y:p.y};
  }
  return result;
}
export function loadLayout(storage){try{return sanitizeLayout(JSON.parse(storage?.getItem(KEY)||'{}'))}catch{return sanitizeLayout({})}}
export function saveLayout(storage,layout){try{storage?.setItem(KEY,JSON.stringify(sanitizeLayout(layout)))}catch{}}
export function applyLayout(layout,doc=document){
  const orientation=window.innerWidth>=window.innerHeight?'landscape':'portrait';
  for(const id of CONTROL_IDS){const el=doc.getElementById(id),p=layout[orientation]?.[id];if(!el)continue;
    for(const prop of ['position','left','top','right','bottom','transform'])el.style.removeProperty(prop);
    if(p){for(const [prop,value] of Object.entries({position:'fixed',left:`${p.x*100}%`,top:`${p.y*100}%`,right:'auto',bottom:'auto',transform:'translate(-50%, -50%)'}))el.style.setProperty(prop,value,'important')}
  }
}
