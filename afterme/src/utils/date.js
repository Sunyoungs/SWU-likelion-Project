// 날짜 표시 공용 함수. 서버가 내려주는 ISO 시각을 화면 표기로 바꾼다.

export const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

// 2026-11-28T16:20:00 → 2026.11.28
export const formatDate = (iso) => ymd(new Date(iso));

// 2026-11-29T16:20:00 → 2026.11.29 16:20
export const formatDateTime = (iso) => {
  const d = new Date(iso);
  return `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 2026-12-02T16:20:00 → 2026.12.02 (수)
export const formatDateWithWeekday = (iso) => {
  const d = new Date(iso);
  return `${ymd(d)} (${WEEKDAYS[d.getDay()]})`;
};

// 지금부터 iso 시각까지 남은 일수 (올림). 0 이하면 이미 지난 시각이다.
export const daysUntil = (iso) => Math.ceil((new Date(iso) - Date.now()) / DAY_MS);
