import {clampView, zoomView, MAX_ZOOM} from './map-geometry.mjs';
const map = document.querySelector('.campus-map');
const stage = map.querySelector('.map-stage');
const plus = document.querySelector('#map-in');
const minus = document.querySelector('#map-out');
const output = document.querySelector('#map-scale');
const pointers = new Map();
const origins = new Map();
let suppressClick = false;
let view = {scale:1,x:0,y:0};
const size = () => ({width:map.clientWidth,height:map.clientHeight});
function render() {
  const {width,height} = size();
  view = clampView(view,width,height);
  stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  output.value = `${Math.round(view.scale*100)}%`;
  plus.disabled = view.scale >= MAX_ZOOM;
  minus.disabled = view.scale <= 1;
  map.classList.toggle('is-zoomed', view.scale>1);
}
function zoom(factor, anchor) {
  const {width,height} = size();
  anchor ||= {x:width/2,y:height/2};
  view = zoomView(view,view.scale*factor,anchor,anchor,width,height);
  render();
}
function reset() {
  pointers.clear();
  origins.clear();
  map.classList.remove('is-dragging');
  view = {scale:1,x:0,y:0};
  render();
}
function local(event) {
  const rect = map.getBoundingClientRect();
  return {x:event.clientX-rect.left-map.clientLeft,y:event.clientY-rect.top-map.clientTop};
}
function pair(points) {
  const [a,b] = points;
  return {center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y)};
}
map.addEventListener('pointerdown', event => {
  if (event.pointerType==='mouse' && event.button!==0) return;
  if (!pointers.size) suppressClick = false;
  pointers.set(event.pointerId,local(event));
  origins.set(event.pointerId,local(event));
  if (pointers.size >= 2) suppressClick = true;
  // Keep a stationary building tap targeted at its button.
  if (!event.target.closest('.map-hotspot')) map.setPointerCapture(event.pointerId);
  map.classList.add('is-dragging');
});
map.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId)) return;
  const previous = [...pointers.values()];
  const last = pointers.get(event.pointerId);
  const current = local(event);
  const origin = origins.get(event.pointerId);
  if (Math.hypot(current.x-origin.x,current.y-origin.y)>8) {
    suppressClick = true;
    if (!map.hasPointerCapture(event.pointerId)) map.setPointerCapture(event.pointerId);
  }
  pointers.set(event.pointerId,current);
  const {width,height} = size();
  if (pointers.size >= 2) {
    const before = pair(previous), after = pair([...pointers.values()]);
    if (before.distance>0) view = zoomView(view,view.scale*after.distance/before.distance,before.center,after.center,width,height);
  } else view = clampView({...view,x:view.x+current.x-last.x,y:view.y+current.y-last.y},width,height);
  render();
});
function release(event) {
  pointers.delete(event.pointerId);
  origins.delete(event.pointerId);
  if (!pointers.size) map.classList.remove('is-dragging');
}
for (const event of ['pointerup','pointercancel']) map.addEventListener(event,release);
map.addEventListener('lostpointercapture',event=>{
  if (event.target===map) release(event);
});
map.addEventListener('click',event=>{
  if (suppressClick && event.detail!==0) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
},true);
plus.addEventListener('click',()=>zoom(1.5));
minus.addEventListener('click',()=>zoom(1/1.5));
map.addEventListener('wheel',event=>{
  if (!event.deltaY) return;
  event.preventDefault();
  const unit = event.deltaMode===1 ? 16 : event.deltaMode===2 ? map.clientHeight : 1;
  const delta = Math.max(-100,Math.min(100,event.deltaY*unit));
  zoom(Math.exp(-delta*0.0025),local(event));
},{passive:false});
document.querySelector('#map-reset').addEventListener('click',reset);
map.addEventListener('map-reset',reset);
map.addEventListener('keydown',event=>{
  if (event.key==='+' || event.key==='=') zoom(1.5);
  else if(event.key==='-') zoom(1/1.5);
  else if(event.key==='Home') reset();
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
    view.x += event.key==='ArrowLeft'?50:event.key==='ArrowRight'?-50:0;
    view.y += event.key==='ArrowUp'?50:event.key==='ArrowDown'?-50:0;
    render();
  } else return;
  event.preventDefault();
});
new ResizeObserver(reset).observe(map);
render();
