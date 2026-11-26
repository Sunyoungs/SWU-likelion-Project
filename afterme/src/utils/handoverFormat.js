export const ROLE = {
  PREDECESSOR: 'PREDECESSOR', 
  SUCCESSOR: 'SUCCESSOR', 
};

export const ROLE_LABEL = {
  PREDECESSOR: '전임자',
  SUCCESSOR: '후임자',
};

export const HANDOVER_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

export const QUIZ_STATUS = {
  NOT_TAKEN: { label: '미응시', tone: 'orange' },
  PASSED: { label: '통과', tone: 'green' },
  FAILED: { label: '미통과', tone: 'pink' },
};

const pad = (n) => String(n).padStart(2, '0');

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const formatDate = (value) => {
  const d = toDate(value);
  if (!d) return '-';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

export const formatPeriod = (start, end) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!e) return formatDate(start);
  const endText =
    s && s.getFullYear() === e.getFullYear()
      ? `${pad(e.getMonth() + 1)}.${pad(e.getDate())}`
      : formatDate(end);
  return `${formatDate(start)} ~ ${endText}`;
};

export const getDdayBadge = (deadline, status) => {
  if (status === HANDOVER_STATUS.COMPLETED) return { label: '완료', tone: 'green' };
  const d = toDate(deadline);
  if (!d) return { label: '-', tone: 'gray' };

  const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
  if (diff < 0) return { label: `마감 초과 D+${-diff}`, tone: 'pink' };
  if (diff === 0) return { label: 'D-DAY', tone: 'orange' };
  return { label: `D-${pad(diff)}`, tone: 'orange' };
};

export const isCompletenessMet = (item) => item.completenessScore >= item.minCompletenessScore;
