export const MAX_ZOOM = 4;
export function clampView(view, width, height) {
  const scale = Math.min(MAX_ZOOM, Math.max(1, view.scale));
  return {scale, x:Math.min(0,Math.max(width*(1-scale),view.x)), y:Math.min(0,Math.max(height*(1-scale),view.y))};
}
export function zoomView(view, scale, anchor, target, width, height) {
  const next = Math.min(MAX_ZOOM,Math.max(1,scale));
  const ratio = next/view.scale;
  return clampView({scale:next,x:target.x-(anchor.x-view.x)*ratio,y:target.y-(anchor.y-view.y)*ratio},width,height);
}
