import {officialFacilities} from './official-facilities.mjs';
import {findRoom} from './room-data.mjs';
export const facilities = [
  {
    "category": "편의점",
    "name": "GS25(한림대학사점1)",
    "location": "CAMPUS LIFE CENTER 2층",
    "phone": "033-248-1135",
    "building": "Campus Life Center"
  },
  {
    "category": "편의점",
    "name": "GS25(한림대학사점2)",
    "location": "자연과학관 4층",
    "phone": "033-248-1136",
    "building": "자연과학관"
  },
  {
    "category": "편의점",
    "name": "GS25(한림대기숙사점)",
    "location": "자연과학관 8관 1층",
    "phone": "033-248-1137",
    "needs_confirmation": "원문 건물명 ‘자연과학관 8관’ 확인 필요. 지도 위치 미지정.",
    "building": null
  },
  {
    "category": "카페",
    "name": "블루포트 대학본부점",
    "location": "대학본부 1층",
    "phone": null,
    "building": "대학본부·인문1관"
  },
  {
    "category": "카페",
    "name": "블루포트 사회경영점",
    "location": "사회·경영2관 1층",
    "phone": null,
    "building": "사회·경영2관"
  },
  {
    "category": "카페",
    "name": "브레댄코",
    "location": "CAMPUS LIFE CENTER 2층",
    "phone": "033-255-6419",
    "building": "Campus Life Center"
  },
  {
    "category": "카페",
    "name": "1847 커피 앤 디저트",
    "location": "생명과학관 1층",
    "phone": "0507-1386-9075",
    "building": "생명과학관"
  },
  {
    "category": "기타",
    "name": "우편취급국",
    "location": "CAMPUS LIFE CENTER 1층",
    "phone": "033-248-1072",
    "building": "Campus Life Center"
  },
  {
    "category": "기타",
    "name": "보건진료소",
    "location": "CAMPUS LIFE CENTER 1층 9101호",
    "phone": "033-248-2890",
    "roomCode": "9101",
    "hours": "월~금 09:00~17:00",
    "closed": "점심시간 12:00~13:00 / 법정공휴일",
    "building": "Campus Life Center"
  },
  {
    "category": "기타",
    "name": "열쇠점",
    "location": "CAMPUS LIFE CENTER 2층",
    "phone": "033-252-1060",
    "building": "Campus Life Center"
  },
  {
    "category": "기타",
    "name": "주차관리",
    "location": "CAMPUS LIFE CENTER 2층",
    "phone": "033-248-1158",
    "building": "Campus Life Center"
  },
  {
    "category": "기타",
    "name": "사전주차 정산기",
    "location": "CAMPUS LIFE CENTER 2층",
    "phone": null,
    "building": "Campus Life Center"
  },
  {
    "category": "기타",
    "name": "사전주차 정산기",
    "location": "일송아트홀",
    "phone": null,
    "building": "일송아트홀"
  },
  {
    "category": "기타",
    "name": "베리어프리 증명서 자동 발급기",
    "location": "CAMPUS LIFE CENTER 3층",
    "phone": null,
    "building": "Campus Life Center"
  },
  {
    "category": "은행",
    "name": "우리은행",
    "location": "한림대학길1(정문)",
    "phone": "033-243-0091",
    "building": null
  }
];
const normalize = value => value.toLowerCase().replace(/[\s·()_-]/g, '');
const canonicalBuilding = name => name ? normalize(findRoom(name)?.name || name) : '';
const names = {'주차관리사무실':'주차관리'};
const sameFacility = (official, supplied) => {
 if (canonicalBuilding(official.building) !== canonicalBuilding(supplied.building)) return false;
 const key = normalize(official.name);
 return (Object.hasOwn(names,key) ? names[key] : key) === normalize(supplied.name)
   || ['카페','편의점','은행'].includes(official.name) && supplied.category === official.name;
};
// Keep supplied details and corrections; attach provenance without replacing them.
const officialOnly = officialFacilities.filter(item => {
 if (item.kind === 'building') return true;
 if (item.name === '카페' && canonicalBuilding(item.building) === canonicalBuilding('사회·경영1관')) return false;
 const matches = facilities.filter(supplied => sameFacility(item,supplied));
 for (const match of matches) match.sourceUrl = item.sourceUrl;
 return !matches.length;
});
export const searchFacilities = [...facilities, ...officialOnly];
export function findFacilities(query) {
 const key = normalize(query);
 if (!key) return [];
 const aliases = {'커피':'카페','우체국':'우편취급국','보건실':'보건진료소','증명서':'증명서','지에스':'gs25','학식':'학생식당','도서관':'일송기념도서관','복사':'복사실','상담':'카운슬링'};
 const term = Object.hasOwn(aliases,key) ? aliases[key] : key;
 return searchFacilities.filter(item => normalize(item.category+' '+item.name+' '+item.location).includes(term));
}

