import {findRoom} from './room-data.mjs';
const input = document.querySelector('#search');
const feedback = document.querySelector('#feedback');
document.querySelector('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (/^\d{4,5}(호)?$/.test(query) || findRoom(query)) {
    location.href = 'classrooms.html?q=' + encodeURIComponent(query);
    return;
  }
  feedback.hidden = false;
  feedback.textContent = query
    ? `‘${query}’ 검색은 준비 중입니다. 현재는 메인화면 미리보기입니다.`
    : '궁금한 강의실, 시설 또는 학교생활 키워드를 입력해 주세요.';
  if (!query) input.focus();
});

document.querySelectorAll('[data-query]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.query === '강의실 번호') {
      location.href = 'classrooms.html';
      return;
    }
    input.value = button.dataset.query;
    feedback.hidden = true;
    feedback.textContent = '';
    input.focus();
  });
});

