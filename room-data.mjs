import {registeredRooms} from './registered-rooms.mjs';
export {registeredRooms};
const buildings = {
  '공학관': {number: 1, x: 13.61, y: 44.90},
  '인문2관': {number: 4, x: 34.23, y: 40.97},
  '자연과학관': {number: 7, x: 31.34, y: 49.74},
  '기초교육관': {number: 16, x: 40.41, y: 12.30}
};
const additional = [
[2,'대학본부·인문1관',438,291],[3,'의학관',347,359],[5,'대학본부별관',517,295],
[6,'실험동물센터',287,330],[8,'생명과학관',186,455],[9,'Campus Life Center',702,260],
[10,'사회·경영1관',437,102],[11,'일송아트홀',297,260],[12,'창업보육센터',153,517],
[13,'사회·경영2관',467,148],[14,'국제관',780,231],[15,'국제회의관',532,605],
[17,'일송기념도서관',329,495],[18,'한림레크리에이션센터',582,528],[19,'학군단',546,86],
[20,'실내테니스장',772,171],[21,'의료·바이오융합연구원',392,334],[22,'산학협력관',416,212],
[23,'도헌글로벌스쿨',231,587],[24,'학생생활관 1관',806,363],[25,'학생생활관 2관',777,326],
[26,'학생생활관 3관',827,325],[27,'학생생활관 4관',791,284],[28,'학생생활관 5관',831,298],
[29,'학생생활관 6관',907,319],[30,'학생생활관 7관',899,241],[31,'학생생활관 8관',822,156],
[32,'체육 기자재실',496,200],[33,'대운동장',630,149],[34,'씨름장',755,137],
[35,'테니스장',338,154],[36,'다목적체육장',229,181],[37,'온실',327,215],
[38,'38번 위치(건물명 확인 중)',112,308],[39,'한림대학교 춘천성심병원',752,492]
];
additional.forEach(([number,name,x,y]) => {buildings[name] = {number,x:x/970*100,y:y/764*100};});
const normalize = value => value.replace(/[\s·・.\-]/g, '').toLowerCase();
const aliases = {'인문1관':2,'대학본부':2,'도서관':17,'레크리에이션센터':18,'한림중개의과학연구원':21,'캠퍼스라이프센터':9,'clc':9,'병원':39,'춘천성심병원':39};
const specialLocations = {
  h: {number:31, title:'H → 학생생활관 8관', detail:'지도 31번 건물'},
  p: {number:18, title:'P → 스포츠센터', detail:'한림레크리에이션센터 · 지도 18번 건물'},
  a: {number:1, title:'A → 공학관 · 4층', detail:'지도 1번 건물'}
};
export function getMapBuildings() {
  return Object.entries(buildings).map(([name, data]) => ({name, ...data})).sort((a,b) => a.number - b.number);
}
export function findRoom(value) {
  const query = value.replace(/\s/g, '').replace(/호$/, '');
  const registered = registeredRooms.filter(r => r.number && r.number.toLowerCase() === query.toLowerCase());
  if (registered.length) {
    const first = registered[0];
    const name = Object.keys(buildings).find(key => buildings[key].number === first.buildingId);
    const floorLabel = floor => /^b\d+$/i.test(floor) ? '지하 ' + floor.slice(1) + '층' : floor.replace(/f$/i, '층');
    const locations = [...new Set(registered.map(r => r.building + ' · ' + floorLabel(r.floor)))];
    return {name, ...buildings[name], registered: true, records: registered,
      title: query + ' → ' + (locations.length === 1 ? name + ' · ' + floorLabel(first.floor) : '등록 위치 ' + locations.length + '개'),
      detail: registered.map(r => r.building + ' · ' + floorLabel(r.floor) + (r.name ? ' · ' + r.name : '')).join('\n')};
  }
  let room, name;
  const special = specialLocations[query.toLowerCase()];
  if (special) {
    name = Object.keys(buildings).find(key => buildings[key].number === special.number);
    return {name, ...buildings[name], title:special.title, detail:special.detail};
  } else if (/^[1-9]\d{3,4}$/.test(query)) {
    const number = Number(query.slice(0,-3));
    const floor = Number(query.slice(-3,-2));
    if (!floor || Number(query.slice(-2)) === 0) return null;
    name = Object.keys(buildings).find(key => buildings[key].number === number);
    room = {floor};
  } else {
    const key = normalize(query);
    name = Object.keys(buildings).find(item => normalize(item) === key);
    if (!name && Object.hasOwn(aliases,key)) name = Object.keys(buildings).find(item => buildings[item].number === aliases[key]);
  }
  if (!name) return null;
  return {name, ...buildings[name], title: room ? `${query} → ${name} · ${room.floor}층` : name,
    detail: room ? `지도 ${buildings[name].number}번 건물 · 번호 규칙 기준` : `지도 ${buildings[name].number}번 건물에 위치를 표시했습니다.`};
}
