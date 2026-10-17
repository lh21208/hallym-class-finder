import {buildingCoordinates} from './building-coordinates.mjs';

const normalize=s=>s.replace(/[\s·・.()_-]/g,'').toLowerCase();
const aliases={'대운동장':'ILSONG Stadium'};
export function getBuildingCoordinates(name) {
  if(!name) return null;
  return buildingCoordinates.find(b=>normalize(b.name)===normalize(aliases[name] || name)) || null;
}

let sdkPromise;
function loadSdk() {
  if(window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps);
  if(sdkPromise) return sdkPromise;
  sdkPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    let done=false;
    const finish=(error)=>{
      if(done) return;
      done=true;
      clearTimeout(timer);
      if(error){script.remove();reject(error);}else resolve(window.kakao.maps);
    };
    const timer=setTimeout(()=>finish(new Error('지도 로딩 시간 초과')),15000);
    script.src='https://dapi.kakao.com/v2/maps/sdk.js?appkey=922f0a76e24f39e0ddb06fd0b2c74802&autoload=false';
    script.async=true;
    script.onerror=()=>finish(new Error('지도 연결 실패'));
    script.onload=()=>{
      if(!window.kakao?.maps?.load) return finish(new Error('지도 사용 설정 확인 필요'));
      window.kakao.maps.load(()=>window.kakao.maps.Map ? finish() : finish(new Error('지도 초기화 실패')));
    };
    document.head.append(script);
  }).catch(error=>{sdkPromise=null;throw error;});
  return sdkPromise;
}

export function createKakaoView(buildings,onSelect,onDeselect) {
  const campus=document.querySelector('#campus-panel');
  const panel=document.querySelector('#kakao-panel');
  const canvas=document.querySelector('#kakao-canvas');
  const status=document.querySelector('#kakao-status');
  const campusButton=document.querySelector('#campus-view');
  const kakaoButton=document.querySelector('#kakao-view');
  let map, api, selected=null, loading=false;
  let startedOnMarker=false;
  canvas.addEventListener('pointerdown',event=>{
    startedOnMarker=Boolean(event.target.closest('.kakao-building'));
  },true);
  const markers=[];
  function sync({recenter=true}={}) {
    if(!map || panel.hidden) return;
    map.relayout();
    const target=getBuildingCoordinates(selected);
    if(recenter) map.setCenter(new api.LatLng(target?.lat ?? 37.8864,target?.lng ?? 127.7384));
    for(const item of markers) {
      const active=item.building.name===selected;
      item.button.setAttribute('aria-pressed',String(active));
      item.button.textContent=active ? item.building.number+' '+item.building.name : item.building.number;
      item.overlay.setZIndex(active ? 5 : 1);
    }
  }
  async function showKakao() {
    campus.hidden=true;
    panel.hidden=false;
    campusButton.setAttribute('aria-pressed','false');
    kakaoButton.setAttribute('aria-pressed','true');
    if(map){sync();return;}
    if(loading) return;
    loading=true;
    status.hidden=false;
    status.textContent='카카오맵을 불러오는 중입니다.';
    try {
      api=await loadSdk();
      // Wait until visible before creating or measuring a Kakao map.
      if(panel.hidden) return;
      map=new api.Map(canvas,{center:new api.LatLng(37.8864,127.7384),level:3});
      map.addControl(new api.ZoomControl(),api.ControlPosition.RIGHT);
      api.event.addListener(map,'click',()=>{
        if(startedOnMarker) return;
        clearSelection();
        onDeselect?.();
      });
      for(const building of buildings) {
        if([34,37].includes(building.number)) continue;
        const location=getBuildingCoordinates(building.name);
        if(!location) continue;
        const button=document.createElement('button');
        button.className='kakao-building';
        button.type='button';
        button.textContent=building.number;
        button.setAttribute('aria-label',building.number+'번 '+building.name);
        button.title=building.name;
        button.addEventListener('click',event=>{
          event.stopPropagation();
          api.event.preventMap();
          selected=building.name;
          sync();
          onSelect(building);
        });
        const overlay=new api.CustomOverlay({map,position:new api.LatLng(location.lat,location.lng),content:button,yAnchor:1,zIndex:1,clickable:true});
        markers.push({building,button,overlay});
      }
      status.hidden=true;
      sync();
    } catch(error) {
      status.hidden=false;
      status.textContent='카카오맵을 불러오지 못했습니다. 캠퍼스 지도를 이용하거나 잠시 후 다시 선택해 주세요.';
    } finally {loading=false;}
  }
  campusButton.addEventListener('click',()=>{
    panel.hidden=true;
    campus.hidden=false;
    campusButton.setAttribute('aria-pressed','true');
    kakaoButton.setAttribute('aria-pressed','false');
    window.dispatchEvent(new Event('resize'));
  });
  kakaoButton.addEventListener('click',showKakao);
  const observer=new ResizeObserver(()=>{if(map && !panel.hidden)sync();});
  observer.observe(canvas);
  function clearSelection() {
    selected=null;
    sync({recenter:false});
  }
  return {selectBuilding(name){selected=name;sync();},clearSelection};
}
