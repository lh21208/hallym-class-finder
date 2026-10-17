import {createKakaoView} from './kakao-map.mjs';
import {getBuildingPhoto} from './building-photos.mjs';
import {recoveredPlans} from './floor-plans.mjs';
import {findRoom, getMapBuildings, registeredRooms} from './room-data.mjs';
import {findFacilities, searchFacilities} from './facilities.mjs';
import './map-navigation.js';
const input = document.querySelector('#room-query');
const pin = document.querySelector('#map-pin');
const list = document.querySelector('#facility-results');
const feedbackOpen = document.querySelector('#feedback-open');
const feedbackDialog = document.querySelector('#feedback-dialog');
const feedbackDetails = document.querySelector('#feedback-details');
const feedbackContext = document.querySelector('#feedback-context');
const searchBox = document.querySelector('.search-box');
const autocomplete = document.createElement('ul');
autocomplete.id = 'search-suggestions';
autocomplete.className = 'search-suggestions';
autocomplete.setAttribute('role', 'listbox');
autocomplete.setAttribute('aria-label', '검색어 추천');
autocomplete.hidden = true;
searchBox.after(autocomplete);
input.setAttribute('role', 'combobox');
input.setAttribute('aria-autocomplete', 'list');
input.setAttribute('aria-controls', autocomplete.id);
input.setAttribute('aria-expanded', 'false');

const normalizeSuggestion = value => value.toLowerCase().replace(/[\s·()_-]/g, '');
const suggestionSource = [
  ...registeredRooms.filter(r => r.number).map(r => ({name:r.number, detail:r.building + ' · ' + (/^b/i.test(r.floor) ? '지하 ' + r.floor.slice(1) + '층' : r.floor.replace('f','층')) + (r.name ? ' · ' + r.name : ''), kind:'호실'})),
  ...getMapBuildings().map(item => ({name: item.name, detail: `${item.number}번 건물`, kind: '건물'})),
  {name: '인문1관', detail: '2번 건물 · 대학본부', kind: '건물'},
  {name: 'H', detail: '학생생활관 8관', kind: '시간표 표기'},
  {name: 'P', detail: '스포츠센터', kind: '시간표 표기'},
  {name: 'A', detail: '공학관 4층', kind: '시간표 표기'},
  ...searchFacilities.filter(item => item.kind !== 'building').map(item => ({name: item.name, detail: item.location, kind: item.category || '시설'}))
].filter((item, index, items) => items.findIndex(candidate => candidate.name === item.name && candidate.detail === item.detail) === index);
let activeSuggestion = -1;

function closeSuggestions() {
  autocomplete.hidden = true;
  autocomplete.replaceChildren();
  activeSuggestion = -1;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}

function chooseSuggestion(item) {
  input.value = item.name;
  closeSuggestions();
  search();
}

function renderSuggestions() {
  const term = normalizeSuggestion(input.value.trim());
  if (!term) return closeSuggestions();
  const matches = suggestionSource
    .filter(item => normalizeSuggestion(`${item.name} ${item.kind} ${item.detail}`).includes(term))
    .sort((a, b) => {
      const aName = normalizeSuggestion(a.name);
      const bName = normalizeSuggestion(b.name);
      return Number(bName.startsWith(term)) - Number(aName.startsWith(term)) || a.name.localeCompare(b.name, 'ko', {numeric:true}) || a.detail.localeCompare(b.detail, 'ko', {numeric:true});
    })
    .slice(0, 6);
  if (!matches.length) return closeSuggestions();
  autocomplete.replaceChildren();
  matches.forEach((item, index) => {
    const row = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `search-suggestion-${index}`;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const detail = document.createElement('span');
    detail.textContent = `${item.kind} · ${item.detail}`;
    button.append(name, detail);
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => chooseSuggestion(item));
    row.append(button);
    autocomplete.append(row);
  });
  autocomplete.hidden = false;
  activeSuggestion = -1;
  input.setAttribute('aria-expanded', 'true');
}

function setActiveSuggestion(index) {
  const options = [...autocomplete.querySelectorAll('[role="option"]')];
  if (!options.length) return;
  activeSuggestion = (index + options.length) % options.length;
  options.forEach((option, optionIndex) => option.setAttribute('aria-selected', String(optionIndex === activeSuggestion)));
  input.setAttribute('aria-activedescendant', options[activeSuggestion].id);
  options[activeSuggestion].scrollIntoView({block: 'nearest'});
}
let kakaoView;
let activeRoomResult=null;
const roomPlanButton=document.createElement('button');
roomPlanButton.type='button';
roomPlanButton.className='room-plan-open';
roomPlanButton.hidden=true;
document.querySelector('.room-result').append(roomPlanButton);
function getRoomFloor(result) {
  if(!result?.registered) return null;
  const locations=new Set(result.records.map(r=>r.buildingId+'|'+r.floor));
  if(locations.size!==1) return null;
  const floor=result.records[0].floor;
  return /^b\d+$/i.test(floor) ? '지하 '+floor.slice(1)+'층' : floor.replace(/f$/i,'층');
}
function updateRoomPlanButton(result) {
  activeRoomResult=result;
  const label=getRoomFloor(result);
  const hasPlan=label && (result.number===17 ? libraryPlans : recoveredPlans[result.number] || []).some(p=>p.label===label);
  roomPlanButton.hidden=!hasPlan;
  if(hasPlan) {
    roomPlanButton.textContent=label+' 도면 보기';
    roomPlanButton.setAttribute('aria-label',result.name+' '+label+' 도면 보기');
  }
}
roomPlanButton.addEventListener('click',()=>{
  if(activeRoomResult && !roomPlanButton.hidden) openBuildingPhoto(activeRoomResult,getRoomFloor(activeRoomResult));
});
function clearMapSelection() {
  pin.hidden=true;
  document.querySelector('#pin-label').textContent='';
  kakaoView?.clearSelection();
}
document.querySelector('.campus-map').addEventListener('click',event=>{
  if(!event.target.closest('.map-hotspot')) clearMapSelection();
});
function showFacility(item) {
  updateRoomPlanButton(null);
  document.querySelector('.campus-map').dispatchEvent(new Event('map-reset'));
  const building = item.building ? findRoom(item.building) : null;
  pin.hidden = !building;
  kakaoView?.selectBuilding(building?.name || null);
  if (building) {
    pin.style.left = building.x + '%';
    pin.style.top = building.y + '%';
    pin.classList.toggle('top-edge', building.y < 20);
    document.querySelector('#pin-label').textContent = building.name;
  }
  document.querySelector('#result-title').textContent = item.name;
  document.querySelector('#result-detail').textContent = item.needs_confirmation ? '위치 확인 중 · 제공된 주소: ' + item.location : item.location;
  list.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.name === item.name && button.dataset.location === item.location)));
}
function search() {
  document.querySelector('.campus-map').dispatchEvent(new Event('map-reset'));
  const query = input.value.trim();
  feedbackOpen.hidden = !query;
  const result = findRoom(query);
  updateRoomPlanButton(result);
  kakaoView?.selectBuilding(result?.name || null);
  const roomQuery = result?.registered || /^\d{4,5}호?$/.test(query.replace(/\s/g, ''));
  const matches = findFacilities(result && !roomQuery ? result.name : query);
  const facilityMatches = matches.filter(item => item.kind !== 'building');
  const facilities = roomQuery ? facilityMatches.filter(item => item.roomCode === query.replace(/\s/g, '').replace(/호$/, '')) : facilityMatches;
  list.replaceChildren();
  list.hidden = !facilities.length;
  const count = document.querySelector('#facility-count');
  count.hidden = !facilities.length;
  count.textContent = `시설 검색 결과 ${facilities.length}개 · 선택하면 위치를 안내합니다.`;
  pin.hidden = !result;
  document.querySelector('#result-title').textContent = result?.title || (query ? '등록된 정보를 찾지 못했습니다' : '강의실 번호를 입력해 주세요');
  document.querySelector('#result-detail').textContent = result?.detail || (query ? '등록된 강의실 번호, 건물명 또는 시설명으로 검색해 보세요. 예: 식당, 복사실, 보건실.' : '예: 7109 → 자연과학관 1층. 식당·카페 같은 시설명으로도 찾을 수 있어요.');
  if (result) {
    pin.style.left = result.x + '%';
    pin.style.top = result.y + '%';
    pin.classList.toggle('top-edge', result.y < 20);
    document.querySelector('#pin-label').textContent = result.name;
  }
  if (facilities.length) {
    facilities.forEach(item => {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.name = item.name;
      button.dataset.location = item.location;
      const name = document.createElement('strong');
      name.textContent = item.name;
      const location = document.createElement('span');
      location.textContent = item.needs_confirmation ? '위치 확인 중' : item.location;
      button.append(name, location);
      if (item.hours) {
        const hours = document.createElement('span');
        hours.textContent = '이용시간 · ' + item.hours;
        button.append(hours);
      }
      if (item.closed) {
        const closed = document.createElement('span');
        closed.textContent = '운영 제외 · ' + item.closed;
        button.append(closed);
      }
      button.addEventListener('click', () => showFacility(item));
      row.append(button);
      if (item.phone) {
        const phone = document.createElement('a');
        phone.href = 'tel:' + item.phone;
        phone.textContent = item.phone;
        phone.setAttribute('aria-label', item.name + ' 전화 ' + item.phone);
        row.append(phone);
      }
      list.append(row);
    });
    if (!result || (roomQuery && !result.registered)) showFacility(facilities[0]);
  }
  const url = new URL(location.href);
  if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
  history.replaceState(null, '', url);
}

const buildingDialog = document.createElement('dialog');
buildingDialog.className = 'building-dialog';
buildingDialog.setAttribute('aria-labelledby','building-photo-title');
const photoHeader = document.createElement('div');
photoHeader.className = 'building-photo-header';
const photoTitle = document.createElement('h2');
photoTitle.id = 'building-photo-title';
const photoClose = document.createElement('button');
photoClose.type = 'button';
photoClose.textContent = '×';
photoClose.setAttribute('aria-label','건물 안내 닫기');
photoHeader.append(photoTitle,photoClose);
const photoBody = document.createElement('div');
photoBody.className = 'building-photo-body';
const photoCredit = document.createElement('p');
photoCredit.className = 'building-photo-credit';
photoCredit.textContent = '사진 출처 · 한림대학교';
const floorPicker=document.createElement('div');
floorPicker.className='library-floor-picker';
floorPicker.setAttribute('role','group');
floorPicker.setAttribute('aria-label','건물 층 선택');
floorPicker.hidden=true;
const photoLarge=document.createElement('a');
photoLarge.className='building-photo-large';
photoLarge.textContent='크게 보기 ↗';
photoLarge.target='_blank';
photoLarge.rel='noopener noreferrer';
photoLarge.hidden=true;
buildingDialog.append(photoHeader,floorPicker,photoBody,photoLarge,photoCredit);
document.body.append(buildingDialog);
photoClose.addEventListener('click',()=>buildingDialog.close());
buildingDialog.addEventListener('click',event=>{
  if(event.target!==buildingDialog) return;
  const rect=buildingDialog.getBoundingClientRect();
  if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) buildingDialog.close();
});
const libraryPlans=[
  {label:'지하 1층',file:'B1.jpg'},
  {label:'1층',file:'1F.jpg'},
  {label:'2층',file:'2F.png'},
  {label:'3층',file:'3F.jpg'},
  {label:'4층',file:'4F.jpg'}
];
function openBuildingPhoto(building,initialFloor=null) {
  photoTitle.textContent=building.name;
  const isLibrary=building.number===17;
  const plans=isLibrary
    ? libraryPlans.map(p=>({label:p.label,url:'https://library.hallym.ac.kr/image/ko/local/guide/'+p.file,alt:'일송기념도서관 '+p.label+' 평면도'}))
    : (recoveredPlans[building.number] || []).map(p=>({...p,alt:building.name+' '+p.label+' 안내도',recovered:true}));
  floorPicker.replaceChildren();
  floorPicker.hidden=plans.length===0;
  floorPicker.setAttribute('aria-label',building.name+' 층 선택');
  const exterior={label:'외관',url:getBuildingPhoto(building.name),alt:building.name+' 외관'};
  const views=[exterior,...plans];
  function show(view) {
    photoTitle.textContent=building.name+(view.label==='외관' ? '' : ' · '+view.label);
    floorPicker.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.textContent===view.label)));
    const status=document.createElement('p');
    status.setAttribute('role','status');
    status.textContent=view.url ? (view.label==='외관' ? '사진을 불러오는 중입니다.' : '평면도를 불러오는 중입니다.') : '등록된 건물 사진이 없습니다.';
    photoBody.replaceChildren(status);
    photoLarge.hidden=true;
    photoCredit.hidden=!view.url;
    photoCredit.textContent=view.label==='외관' ? '사진 출처 · 한림대학교' : '평면도 출처 · 한림대학교 일송기념도서관';
    if(view.recovered){
      photoCredit.textContent='2022년 안내도로 현재와 다를 수 있습니다.';
    }
    if(!view.url) return;
    const img=document.createElement('img');
    img.alt=view.alt;
    img.referrerPolicy='no-referrer';
    img.hidden=true;
    img.addEventListener('load',()=>{
      if(!photoBody.contains(img))return;
      status.hidden=true;img.hidden=false;
      photoLarge.href=view.url;
      photoLarge.setAttribute('aria-label',view.alt+' 크게 보기 (새 창)');
      photoLarge.hidden=false;
    });
    img.addEventListener('error',()=>{
      if(!photoBody.contains(img))return;
      img.hidden=true;status.hidden=false;
      status.textContent=view.label==='외관' ? '사진을 불러오지 못했습니다.' : '평면도를 불러오지 못했습니다. 잠시 후 다시 선택해 주세요.';
    });
    img.src=view.url;
    photoBody.append(img);
  }
  if(plans.length) for(const view of views){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=view.label;
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>show(view));
    floorPicker.append(button);
  }
  show(plans.find(p=>p.label===initialFloor) || exterior);
  if(!buildingDialog.open) buildingDialog.showModal();
}

const mapStage = document.querySelector('.map-stage');
function selectMapBuilding(building) {
  const room=findRoom(input.value.trim());
  const keepRoom=room?.registered && room.number===building.number;
  if(!keepRoom) input.value=building.name;
  closeSuggestions();
  search();
  openBuildingPhoto(building,keepRoom ? getRoomFloor(room) : null);
}
for (const building of getMapBuildings()) {
  if ([34,36,37,38].includes(building.number)) continue;
  const hotspot = document.createElement('button');
  hotspot.type = 'button';
  hotspot.className = 'map-hotspot';
  hotspot.style.left = building.x + '%';
  hotspot.style.top = building.y + '%';
  hotspot.setAttribute('aria-label', `${building.number}번 ${building.name}`);
  hotspot.title = `${building.number}번 ${building.name}`;
  hotspot.addEventListener('click', () => selectMapBuilding(building));
  mapStage.append(hotspot);
}
document.querySelector('#classroom-form').addEventListener('submit', event => {event.preventDefault();closeSuggestions();search();});
document.querySelectorAll('[data-room]').forEach(button => button.addEventListener('click', () => {input.value = button.dataset.room;search();}));
input.addEventListener('input', renderSuggestions);
input.addEventListener('focus', renderSuggestions);
input.addEventListener('keydown', event => {
  if (autocomplete.hidden && ['ArrowDown', 'ArrowUp'].includes(event.key)) renderSuggestions();
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setActiveSuggestion(activeSuggestion + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    setActiveSuggestion(activeSuggestion - 1);
  } else if (event.key === 'Enter' && activeSuggestion >= 0) {
    event.preventDefault();
    autocomplete.querySelectorAll('[role="option"]')[activeSuggestion]?.click();
  } else if (event.key === 'Escape') {
    closeSuggestions();
  }
});
document.addEventListener('pointerdown', event => {
  if (!document.querySelector('#classroom-form').contains(event.target)) closeSuggestions();
});
feedbackOpen.addEventListener('click', () => {
  feedbackContext.textContent = `${input.value.trim()} · ${document.querySelector('#result-title').textContent}`;
  feedbackDetails.value = '';
  feedbackDialog.showModal();
  feedbackDetails.focus();
});
document.querySelector('#feedback-close').addEventListener('click', () => feedbackDialog.close());
document.querySelector('#feedback-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!feedbackDetails.reportValidity()) return;
  const formUrl = new URL('https://docs.google.com/forms/d/e/1FAIpQLSc84jZRDYK-9FNzYFeiLD_Qbxl66p7tozeEKAuj8GRp8b8DhQ/viewform');
  formUrl.searchParams.set('usp', 'pp_url');
  formUrl.searchParams.set('entry.920836541', `${input.value.trim()} · ${document.querySelector('#result-title').textContent}`);
  formUrl.searchParams.set('entry.886237572', feedbackDetails.value.trim());
  window.open(formUrl, '_blank', 'noopener');
  feedbackDialog.close();
});
kakaoView = createKakaoView(getMapBuildings(),selectMapBuilding,clearMapSelection);
input.value = new URLSearchParams(location.search).get('q') || '';
search();
