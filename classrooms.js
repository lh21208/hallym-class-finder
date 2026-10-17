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
      return Number(bName.startsWith(term)) - Number(aName.startsWith(term)) || aName.length - bName.length || a.name.localeCompare(b.name, 'ko');
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
function showFacility(item) {
  document.querySelector('.campus-map').dispatchEvent(new Event('map-reset'));
  const building = item.building ? findRoom(item.building) : null;
  pin.hidden = !building;
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
  document.querySelector('#result-title').textContent = result?.title || (query ? '번호 또는 건물명을 확인해 주세요' : '강의실 번호를 입력해 주세요');
  document.querySelector('#result-detail').textContent = result?.detail || (query ? '강의실 번호, 건물명 또는 시설명으로 검색해 보세요. 예: 식당, 복사실, 보건실. 지하층·예외 강의실 표기는 아직 지원하지 않습니다.' : '예: 7109 → 자연과학관 1층. 식당·카페 같은 시설명으로도 찾을 수 있어요.');
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
const mapStage = document.querySelector('.map-stage');
for (const building of getMapBuildings()) {
  const hotspot = document.createElement('button');
  hotspot.type = 'button';
  hotspot.className = 'map-hotspot';
  hotspot.style.left = building.x + '%';
  hotspot.style.top = building.y + '%';
  hotspot.setAttribute('aria-label', `${building.number}번 ${building.name}`);
  hotspot.title = `${building.number}번 ${building.name}`;
  hotspot.addEventListener('pointerdown', event => event.stopPropagation());
  hotspot.addEventListener('click', () => {
    input.value = building.name;
    search();
    document.querySelector('#result-title').scrollIntoView({behavior: 'smooth', block: 'nearest'});
  });
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
input.value = new URLSearchParams(location.search).get('q') || '';
search();
