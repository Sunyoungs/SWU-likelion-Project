import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './HandoverCreate.module.css';
import { ApiError, createHandoverApi } from '../api/handoverCreateApi';

const extra = styles;

const CYCLE_OPTIONS = ['매일', '매주', '매월', '학기 단위', '연 1회', '비정기'];
const IMPORTANCE_OPTIONS = ['상', '중', '하'];
const ORG_OPTIONS = ['기획팀', '홍보팀', '총무팀', '디자인팀', '대외협력팀'];
const ROLE_OPTIONS = ['회장', '부회장', '팀장', '팀원'];
const KEYWORDS = [
  '신입 모집', '정기 세미나', '장소 대여/대관', 'SNS 카드뉴스',
  '자료 제작', '기획서', '축제 부스', '스폰서 제휴',
];
const TOC = ['업무 개요', '파일 첨부', 'AI 답변 입력', '마감 설정'];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'xlsx'];
const MAX_FOLLOW_UP = 2;

const MIN_COMPLETION = 70;
const MIN_QUIZ_CUTOFF = 80;
const YEAR_COUNT = 5;
const MAX_DEADLINE_DAYS = 31;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINK_FIELDS = [
  { key: 'notion', label: '노션' },
  { key: 'drive', label: '구글 드라이브' },
  { key: 'figma', label: '피그마' },
  { key: 'etc', label: '이외 링크' },
];
const CHECKLIST = [
  '인스타그램/카카오톡 계정 관리자 권한 이전이 완료되었나요?',
  '조직 공용 구글/네이버 계정의 비밀번호와 복구용 연락처를 변경 후 전달하셨나요?',
  '교내 시설/대관 신청 시스템의 ID와 비밀번호를 후임자에게 넘겨주셨나요?',
  '역대 활동 자료가 보관된 아카이빙 폴더의 접근 권한을 공유하셨나요?',
];

const API_ERROR_MESSAGE = {
  400: '입력값을 다시 확인해 주세요. 마감일과 전임자 선택이 올바른지 확인이 필요해요.',
  401: '로그인이 만료되었어요. 다시 로그인해 주세요.',
  403: '이 조직의 관리자만 인수인계서를 만들 수 있어요.',
  404: '조직 정보를 찾을 수 없어요.',
  409: '현재 상태와 충돌해서 처리하지 못했어요. 새로고침 후 다시 시도해 주세요.',
};
const DEFAULT_ERROR = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
const NETWORK_ERROR = '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';

const INITIAL_CLOSING = {
  year: '',
  month: '',
  day: '',
  successors: [{ email: '', name: '' }],
  completion: MIN_COMPLETION,
  quizCutoff: MIN_QUIZ_CUTOFF,
  inviteCode: '',
};

const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

const addDays = (ymd, days) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

const pad = (n) => String(n).padStart(2, '0');
const daysInMonth = (y, m) => new Date(Date.UTC(Number(y) || 2024, Number(m) || 1, 0)).getUTCDate();
const diffDays = (fromYmd, toYmd) => {
  const [fy, fm, fd] = fromYmd.split('-').map(Number);
  const [ty, tm, td] = toYmd.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
};
const toDeadline = ({ year, month, day }) => (year && month && day ? `${year}-${month}-${day}` : '');

const fileExt = (name) => name.split('.').pop().toLowerCase();
const fileSizeLabel = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(b / 1024)}KB`);

const hasText = (arr) => arr.some((v) => v.trim());
const clean = (arr) => arr.map((v) => v.trim()).filter(Boolean);
const joinAnswer = (arr) => clean(arr ?? []).join('\n');
const idOf = (data) => data?.projectId ?? data?.id ?? null;
const taskIdOf = (data) => data?.taskId ?? data?.id ?? null;

/* 에러 → 화면 메시지
   - 서버 응답(ApiError): 400이면 서버가 준 필드 검증 메시지(errors[0].message)를 우선 사용
   - 서버 코드가 있으면 상태별 안내문, 우리가 직접 던진 에러(code 없음)는 그 메시지를 그대로 사용
   - 응답 없는 네트워크 오류만 "네트워크 확인" 안내, 그 외 코드 오류는 일반 안내 */
const errorMessage = (err) => {
  if (err instanceof ApiError) {
    const fieldMsg = err.errors?.[0]?.message;
    if (err.status === 400 && fieldMsg) return fieldMsg;
    if (err.code) return API_ERROR_MESSAGE[err.status] ?? err.message ?? DEFAULT_ERROR;
    return err.message || API_ERROR_MESSAGE[err.status] || DEFAULT_ERROR;
  }
  if (err?.isAxiosError || err?.request) return NETWORK_ERROR;
  return DEFAULT_ERROR;
};

export function MultiInput({ values, onChange, placeholder, small = false, multiline = false, hideAdd = false }) {
  const setAt = (i, v) => onChange(values.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...values, '']);
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  const Tag = multiline ? 'textarea' : 'input';

  return (
    <div className={styles.multi}>
      {values.map((value, i) => (
        <div key={i} className={styles.inputRow}>
          <Tag
            className={`${styles.input} ${multiline ? extra.textarea : ''}`}
            value={value}
            placeholder={placeholder}
            onChange={(e) => setAt(i, e.target.value)}
          />
          {values.length > 1 && (
            <button type="button" className={styles.removeBtn} aria-label="항목 삭제" onClick={() => remove(i)}>
              ×
            </button>
          )}
        </div>
      ))}
      {!hideAdd && (
        <div className={styles.addRow}>
          <button type="button" className={`${styles.addBtn} ${small ? styles.addBtnSmall : ''}`} onClick={add}>
            추가
          </button>
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, options, className = '' }) {
  return (
    <div className={`${styles.selectWrap} ${className}`}>
      <select
        className={`${styles.select} ${value ? styles.selected : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled hidden>선택</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <svg className={styles.chevron} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M2 4.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function GroupList({ items, onChange, fields, makeEmpty }) {
  const setField = (idx, key, value) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  return (
    <div className={styles.groupList}>
      {items.map((item, idx) => (
        <div key={idx} className={styles.group}>
          {fields.map((f) => (
            <div key={f.key} className={styles.groupField}>
              <span className={styles.groupLabel}>{f.label}</span>
              {f.type === 'radio' ? (
                <div className={styles.radioRow}>
                  {f.options.map((opt) => (
                    <label key={opt} className={styles.radio}>
                      <input
                        type="radio"
                        name={`${f.key}-${idx}`}
                        checked={item[f.key] === opt}
                        onChange={() => setField(idx, f.key, opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <MultiInput small values={item[f.key]} placeholder={f.placeholder} onChange={(v) => setField(idx, f.key, v)} />
              )}
            </div>
          ))}
          {items.length > 1 && (
            <button type="button" className={styles.groupRemove} onClick={() => onChange(items.filter((_, i) => i !== idx))}>
              이 항목 삭제
            </button>
          )}
        </div>
      ))}
      <div className={styles.addRow}>
        <button type="button" className={styles.addBtn} onClick={() => onChange([...items, makeEmpty()])}>
          추가
        </button>
      </div>
    </div>
  );
}

function Question({ title, hint, children }) {
  return (
    <section className={styles.question}>
      <h3 className={styles.questionTitle}>{title}</h3>
      {hint && <p className={styles.hint}>{hint}</p>}
      {children}
    </section>
  );
}

function SectionHead({ number, title, desc, meta }) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>
        <span>{number}.</span> {title}
      </h2>
      <p className={styles.sectionDesc}>
        <span className={extra.descText}>{desc}</span>
        {meta && <span className={extra.descMeta}>{meta}</span>}
      </p>
    </div>
  );
}

function AiError({ onRetry, message = 'AI 분석에 실패했어요. 작성한 답변은 그대로 남아 있어요.' }) {
  return (
    <div className={extra.aiError} role="alert">
      <span className={extra.aiErrorMsg}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3L1.5 21h21L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 10v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1.2" fill="currentColor" />
        </svg>
        {message}
      </span>
      <button type="button" className={extra.retryBtn} onClick={onRetry}>다시 시도</button>
    </div>
  );
}

function Footer({ onPrev, onNext, nextLabel = '다음', nextEnabled = true, warning, loading, loadingLabel = '생성 중...' }) {
  return (
    <div className={styles.footer}>
      {warning && <p className={extra.warning} role="alert">{warning}</p>}
      <div className={extra.footerBtns}>
        {onPrev ? (
          <button type="button" className={extra.prevBtn} onClick={onPrev} disabled={loading}>이전</button>
        ) : <span />}
        <button
          type="button"
          className={`${styles.nextBtn} ${nextEnabled ? styles.nextOn : ''}`}
          onClick={onNext}
          disabled={loading}
          aria-disabled={!nextEnabled}
        >
          {loading ? loadingLabel : nextLabel}
        </button>
      </div>
    </div>
  );
}

function DateSelect({ value, onChange, options, placeholder, label, listMax }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className={styles.dlDateSelect} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        className={`${styles.dlTrigger} ${open ? styles.dlTriggerOpen : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? styles.dlTriggerValue : styles.dlTriggerPlaceholder}>{value || placeholder}</span>
        <svg className={styles.dlCaret} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2 4.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          className={styles.dlList}
          role="listbox"
          aria-label={label}
          style={listMax ? { maxHeight: listMax * 40 } : undefined}
        >
          {options.map((o) => (
            <li key={o} role="option" aria-selected={o === value}>
              <button
                type="button"
                className={`${styles.dlOption} ${o === value ? styles.dlOptionOn : ''}`}
                onClick={() => { onChange(o); setOpen(false); }}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GaugeSlider({ value, min, onChange, label }) {
  const pct = ((value - min) / (100 - min)) * 100;
  return (
    <div className={styles.dlSliderRow}>
      <input
        type="range"
        className={styles.dlRange}
        min={min}
        max={100}
        step={5}
        value={value}
        aria-label={label}
        style={{ '--pct': `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={styles.dlPctBadge}>{value}%</span>
    </div>
  );
}

const POSITION_FIELDS = [
  { key: 'position', label: '소속/직책', placeholder: '담당했던 소속/직책을 입력해 주세요.' },
  { key: 'role', label: '핵심 역할', placeholder: '담당했던 핵심 역할을 입력해 주세요.' },
];
const EVENT_FIELDS = [
  { key: 'name', label: '사업/행사명', placeholder: '사업/행사명을 입력해 주세요.' },
  { key: 'goal', label: '행사 성과/목표', placeholder: '해당 행사 성과/목표를 입력해 주세요.' },
  { key: 'myRole', label: '내 주요 역할', placeholder: '행사를 수행하면서 담당했던 주요 역할에 대해 작성해 주세요.' },
];
const CONTACT_FIELDS = [
  { key: 'name', label: '사업/행사명', placeholder: '사업/행사명을 입력해 주세요.' },
  { key: 'type', label: '유형', type: 'radio', options: ['내부 협업', '외부 협업'] },
  { key: 'role', label: '해당 담당자 역할', placeholder: '해당 담당자분의 역할을 적어 주세요.' },
];

/* 그룹 항목({ key: [''] | 문자열 })을 서버로 보내기 좋은 형태로 정리 */
const cleanGroups = (items) =>
  items
    .map((it) =>
      Object.fromEntries(Object.entries(it).map(([k, v]) => [k, Array.isArray(v) ? clean(v) : v]))
    )
    .filter((it) => Object.values(it).some((v) => (Array.isArray(v) ? v.length : v)));

export default function HandoverCreate({ organizationId, accessToken, currentMemberId, createdProject, onCreated }) {
  const api = useMemo(() => createHandoverApi(accessToken), [accessToken]);

  const [step, setStep] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const [taskNames, setTaskNames] = useState(['']);
  const [cycle, setCycle] = useState('');
  const [importance, setImportance] = useState('');
  const [org, setOrg] = useState('');
  const [role, setRole] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [coreRoles, setCoreRoles] = useState(['']);
  const [positions, setPositions] = useState([{ position: [''], role: [''] }]);
  const [events, setEvents] = useState([{ name: [''], goal: [''], myRole: [''] }]);
  const [weekly, setWeekly] = useState(['']);
  const [monthly, setMonthly] = useState(['']);
  const [semester, setSemester] = useState(['']);
  const [contacts, setContacts] = useState([{ name: [''], type: '', role: [''] }]);

  const prevDocRef = useRef(null);
  const [prevDoc, setPrevDoc] = useState(null); // TODO: 전임자 인수인계서 업로드 endpoint가 명세서에 없어 아직 서버로 보내지 않아요.

  const attachRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [links, setLinks] = useState({ notion: [''], drive: [''], figma: [''], etc: [''] });
  const [checks, setChecks] = useState(CHECKLIST.map(() => false));

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [aiError, setAiError] = useState({}); // { _load: msg, [qId]: 'ai' | 'save' }
  const [aiLoading, setAiLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const today = seoulToday();
  const maxDeadline = addDays(today, MAX_DEADLINE_DAYS);
  const [closing, setClosing] = useState(INITIAL_CLOSING);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const deadline = toDeadline(closing);
  const setClose = (patch) => setClosing((c) => ({ ...c, ...patch }));

  /* 서버에 이미 만든 것들 (재시도해도 중복 생성되지 않게 ref에 진행 상황을 보관) */
  const serverRef = useRef({
    project: createdProject ?? null,
    projectId: idOf(createdProject),
    deadline: createdProject?.deadline ?? '',
    tasks: [], // [{ taskId, name }]
    uploaded: new Set(), // 업로드 완료한 File 객체
    sessions: [], // [{ taskId, sessionId, questions }]
    confirmed: new Set(), // 확정 완료한 sessionId
    criteriaSent: '',
    invitedEmails: new Set(), // 서버에 후임자로 등록 완료한 이메일
  });
  const savedRef = useRef({}); // { [qId]: 마지막으로 서버에 저장한 답변 }
  const analyzedRef = useRef({}); // { [qId]: 마지막으로 AI 추가 질문을 요청한 답변 }

  const toggleKeyword = (k) =>
    setKeywords((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const step1Valid = useMemo(
    () => hasText(taskNames) && !!cycle && !!importance && !!org && !!role,
    [taskNames, cycle, importance, org, role]
  );
  const step2Valid = checks.every(Boolean);
  const answeredCount = questions.filter((q) => hasText(answers[q.id] ?? [''])).length;
  const baseQuestions = questions.filter((q) => !(q.followUpOf ?? q.parentQuestionId));
  const answeredBase = baseQuestions.filter((q) => hasText(answers[q.id] ?? [''])).length;
  const step3Valid = questions.length > 0 && answeredCount === questions.length;
  const deadlineOutOfRange = !!deadline && (deadline < today || deadline > maxDeadline);
  const emailsValid = closing.successors.every((r) => !r.email.trim() || EMAIL_RE.test(r.email.trim()));
  const successorsValid = closing.successors.every((r) => {
    const email = r.email.trim();
    const name = r.name.trim();
    if (!email && !name) return true; // 후임자는 선택 사항
    return EMAIL_RE.test(email) && !!name;
  });
  const step4Valid = !!deadline && !deadlineOutOfRange && emailsValid && successorsValid;
  const thisYear = Number(today.slice(0, 4));
  const yearOptions = Array.from({ length: YEAR_COUNT }, (_, i) => String(thisYear + i));
  const monthOptions = Array.from({ length: 12 }, (_, i) => pad(i + 1));
  const dayOptions = Array.from({ length: daysInMonth(closing.year, closing.month) }, (_, i) => pad(i + 1));
  const left = deadline ? diffDays(today, deadline) : null;
  const dLabel = left === null ? '' : left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `D+${-left}`;

  const changeYear = (y) => {
    const max = daysInMonth(y, closing.month);
    setClose({ year: y, day: closing.day && Number(closing.day) > max ? '' : closing.day });
  };
  const changeMonth = (m) => {
    const max = daysInMonth(closing.year, m);
    setClose({ month: m, day: closing.day && Number(closing.day) > max ? '' : closing.day });
  };
  const setSuccessor = (i, patch) =>
    setClose({ successors: closing.successors.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });

  const filledSuccessors = () =>
    closing.successors
      .map((r) => ({ email: r.email.trim(), name: r.name.trim() }))
      .filter((r) => r.email && r.name);

  const addFiles = (list) => {
    const next = [];
    let err = '';
    Array.from(list).forEach((f) => {
      if (!ALLOWED_EXT.includes(fileExt(f.name))) err = 'PDF, PNG, JPG, JPEG, GIF, xlsx 파일만 첨부할 수 있어요.';
      else if (f.size > MAX_FILE_SIZE) err = '파일은 최대 10MB까지 첨부할 수 있어요.';
      else next.push(f);
    });
    setFileError(err);
    if (next.length) setFiles((prev) => [...prev, ...next]);
  };

  /* ---------- 서버 준비: 프로젝트 → 업무 → 첨부파일 → 인터뷰(AI 질문) ----------
     AI 질문을 받으려면 projectId / taskId가 필요해서 2단계 → 3단계 넘어갈 때 만들어요.
     마감일은 4단계에서 정하므로 우선 최대 기간(오늘+31일)으로 만들고, 4단계에서 PATCH로 확정해요. */
  const ensureProject = async () => {
    const s = serverRef.current;
    if (s.projectId) return;
    if (!currentMemberId) {
      throw new ApiError(400, '전임자 정보를 확인할 수 없어요. 다시 로그인해 주세요.');
    }
    const title = clean(taskNames).join(', ');
    const project = await api.createProject({
      organizationId,
      title,
      roleName: `${org} ${role}`.trim(),
      deadline: maxDeadline,
      predecessorMemberIds: [String(currentMemberId)],
    });
    s.project = project;
    s.projectId = idOf(project);
    s.deadline = project?.deadline ?? maxDeadline;
  };

  const buildTaskBody = (name) => ({
    name,
    cycle,
    importance,
    organization: org,
    role,
    keywords,
    coreRoles: clean(coreRoles),
    positions: cleanGroups(positions),
    events: cleanGroups(events),
    repeatTasks: { weekly: clean(weekly), monthly: clean(monthly), semester: clean(semester) },
    contacts: cleanGroups(contacts),
    links: Object.fromEntries(Object.entries(links).map(([k, v]) => [k, clean(v)])),
  });

  /* 서버에 아직 안 보낸 것(새 업무 / 새 파일 / 인터뷰 미시작)이 있는지 */
  const needsSync = () => {
    const s = serverRef.current;
    return (
      questions.length === 0 ||
      clean(taskNames).length > s.tasks.length ||
      files.some((f) => !s.uploaded.has(f)) ||
      s.sessions.length < s.tasks.length
    );
  };

  /* 이미 보낸 것은 건너뛰고 새로 생긴 것만 보내요. (뒤로 갔다가 업무/파일을 추가한 경우도 반영)
     참고: 이미 등록된 업무의 수정/삭제, 이미 올린 파일의 삭제는 명세서에 API가 없어 반영하지 않아요. */
  const prepareInterviews = async () => {
    const s = serverRef.current;
    await ensureProject();

    const names = clean(taskNames);
    for (let i = s.tasks.length; i < names.length; i += 1) {
      const task = await api.createTask(s.projectId, buildTaskBody(names[i]));
      s.tasks.push({ taskId: taskIdOf(task), name: names[i] });
    }

    // 첨부파일은 첫 번째 업무에 붙여요. (업무별로 나누고 싶으면 파일마다 taskId를 고르는 UI가 필요해요)
    const firstTaskId = s.tasks[0]?.taskId;
    for (const f of files) {
      if (s.uploaded.has(f)) continue;
      await api.uploadAttachment(s.projectId, firstTaskId, f);
      s.uploaded.add(f);
    }

    for (let i = s.sessions.length; i < s.tasks.length; i += 1) {
      s.sessions.push(await api.startInterview(s.projectId, s.tasks[i].taskId));
    }
    return s.sessions.flatMap((x) => x.questions);
  };

  const goStep1Next = () => {
    if (!step1Valid) return setShowWarning(true);
    setShowWarning(false);
    setStep(1);
  };

  const goStep2Next = async () => {
    if (!step2Valid) return;
    setStep(2);
    if (!needsSync()) return;

    setAiLoading(true);
    setAiError({});
    try {
      const all = await prepareInterviews();

      // 이미 화면에 있는 질문/답변은 그대로 두고, 새로 받은 것만 붙여요.
      setQuestions((prev) => {
        const known = new Set(prev.map((q) => q.id));
        return [...prev, ...all.filter((q) => !known.has(q.id))];
      });
      setAnswers((prev) => {
        const next = { ...prev };
        all.forEach((q) => {
          if (!(q.id in next)) next[q.id] = [q.savedAnswer || ''];
        });
        return next;
      });
      all.forEach((q) => {
        if (q.savedAnswer && !(q.id in savedRef.current)) savedRef.current[q.id] = q.savedAnswer;
      });
    } catch (err) {
      setAiError({ _load: errorMessage(err) });
    } finally {
      setAiLoading(false);
    }
  };

  const saveAnswer = async (q) => {
    const content = joinAnswer(answers[q.id]);
    if (!content || savedRef.current[q.id] === content) return;
    await api.saveAnswer(serverRef.current.projectId, q, content);
    savedRef.current[q.id] = content;
  };

  const analyzeAnswer = async (q) => {
    const content = joinAnswer(answers[q.id]);
    if (!content) return;

    try {
      await saveAnswer(q);
    } catch {
      setAiError((e) => ({ ...e, [q.id]: 'save' }));
      return;
    }

    const followCount = questions.filter((x) => x.followUpOf === q.id).length;
    const skip = !!(q.followUpOf ?? q.parentQuestionId) || followCount >= MAX_FOLLOW_UP || analyzedRef.current[q.id] === content;
    if (skip) {
      setAiError((e) => ({ ...e, [q.id]: false }));
      return;
    }

    try {
      const children = await api.requestFollowUps(serverRef.current.projectId, q);
      analyzedRef.current[q.id] = content;
      setAiError((e) => ({ ...e, [q.id]: false }));

      const known = new Set(questions.map((x) => x.id));
      const fresh = children.find((c) => !known.has(c.id));
      if (!fresh) return;

      const nq = { ...fresh, followUpOf: q.id, followUpIndex: fresh.followUpIndex ?? followCount + 1 };
      setQuestions((prev) => {
        const i = prev.findIndex((x) => x.id === q.id);
        let end = i;
        while (prev[end + 1]?.followUpOf === q.id) end += 1;
        return [...prev.slice(0, end + 1), nq, ...prev.slice(end + 1)];
      });
      setAnswers((a) => ({ ...a, [nq.id]: [''] }));
    } catch {
      setAiError((e) => ({ ...e, [q.id]: 'ai' }));
    }
  };

  /* 3단계 → 4단계: 모든 답변 저장 후 인터뷰 답변 확정 */
  const goStep3Next = async () => {
    if (!step3Valid || confirming) return;
    const s = serverRef.current;
    setConfirming(true);
    setConfirmError('');
    try {
      for (const q of questions) await saveAnswer(q);
      for (const { sessionId } of s.sessions) {
        if (s.confirmed.has(sessionId)) continue;
        await api.confirmInterview(s.projectId, sessionId);
        s.confirmed.add(sessionId);
      }
      setStep(3);
    } catch (err) {
      setConfirmError(errorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  /* 아직 서버에 등록하지 않은 후임자만 등록하고, 받은 참여 코드를 화면에 보여줘요.
     (이미 등록한 후임자는 다시 보내지 않아 중복 등록/409를 막아요) */
  const registerSuccessors = async () => {
    const s = serverRef.current;
    const pending = filledSuccessors().filter((r) => !s.invitedEmails.has(r.email));
    if (pending.length === 0) return;

    const issued = await api.createInvitations(s.projectId, pending, (email) => s.invitedEmails.add(email));
    const code = Object.values(issued).find(Boolean);
    if (code) setClosing((c) => ({ ...c, inviteCode: c.inviteCode || code }));
  };

  /* 후임자 등록 + 참여 코드 발급 */
  const generateCode = async () => {
    const s = serverRef.current;
    if (codeLoading || !s.projectId) return;
    const list = filledSuccessors();
    if (list.length === 0) {
      setCodeError('후임자 이름과 이메일을 먼저 입력해 주세요.');
      return;
    }
    if (list.every((r) => s.invitedEmails.has(r.email))) {
      setCodeError(''); // 이미 모두 등록됨 → 다시 만들지 않아요.
      return;
    }
    setCodeLoading(true);
    setCodeError('');
    try {
      await registerSuccessors();
    } catch {
      setCodeError('초대 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!step4Valid || submitting) return;
    if (!currentMemberId) {
      setSubmitError('전임자 정보를 확인할 수 없어요. 다시 로그인해 주세요.');
      return;
    }

    const s = serverRef.current;
    const title = clean(taskNames).join(', ');
    const roleName = `${org} ${role}`.trim();
    const buildSnapshot = () => ({
      title, roleName, deadline, files, links, taskNames, cycle, importance,
      coreRoles, weekly, monthly, semester, contacts,
      successors: closing.successors, answeredCount,
      tasks: s.tasks, sessions: s.sessions,
      invited: s.invitedEmails.size > 0, inviteCode: closing.inviteCode,
    });

    /* 부모가 넘겨준(이미 완료된) 프로젝트면 다시 만들지 않고 초안 화면으로만 이동 */
    if (createdProject) {
      const changed =
        title !== createdProject.title ||
        roleName !== createdProject.roleName ||
        deadline !== createdProject.deadline;
      if (changed) {
        setSubmitError('이미 생성된 인수인계서라 업무명, 조직/역할, 마감일은 바꿀 수 없어요.');
        return;
      }
      setSubmitError('');
      onCreated?.(createdProject, buildSnapshot());
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await ensureProject(); // 보통은 3단계 진입 때 이미 만들어져 있어요.

      if (deadline !== s.deadline) {
        await api.updateDeadline(s.projectId, deadline);
        s.deadline = deadline;
      }

      const criteriaKey = `${closing.completion}/${closing.quizCutoff}`;
      if (s.criteriaSent !== criteriaKey) {
        await api.setCriteria(s.projectId, closing);
        s.criteriaSent = criteriaKey;
      }

      // 코드 생성 버튼을 안 눌렀어도, 입력한 후임자는 등록해 둬요. (이미 등록한 사람은 건너뜀)
      await registerSuccessors();

      onCreated?.({ ...(s.project ?? {}), id: s.projectId, projectId: s.projectId, title, roleName, deadline }, buildSnapshot());
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>인수인계서 생성</h1>
        <p className={styles.subtitle}>새로운 인수인계서를 생성합니다. 아래에 필요한 내용을 채워 넣어주세요.</p>
      </header>

      <div className={styles.body}>
        <aside className={styles.toc} aria-label="목차">
          <span className={styles.tocLabel}>목차</span>
          <ol className={styles.tocList}>
            {TOC.map((t, i) => (
              <li key={t} className={i === step ? styles.tocActive : ''} aria-current={i === step ? 'step' : undefined}>
                {i + 1}. {t}
              </li>
            ))}
          </ol>
        </aside>

        <div className={styles.main}>
          {step === 0 && (
            <>
              <section className={styles.upload}>
                <h2 className={styles.uploadTitle}>
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--orange-6)" strokeWidth="1.6" />
                    <rect x="11.1" y="10.5" width="1.8" height="7" rx="0.9" fill="var(--orange-6)" />
                    <circle cx="12" cy="7.3" r="1.1" fill="var(--orange-6)" />
                  </svg>
                  인수인계서 파일 업로드
                </h2>
                <p className={styles.uploadDesc}>
                  전임자에게로부터 받은 인수인계서 파일이 있다면 업로드해주세요. AI가 이를 바탕으로 앞으로 작성할 인수인계서 내용을 미리 적어줄게요.
                </p>
                <button type="button" className={styles.uploadBtn} onClick={() => prevDocRef.current?.click()}>
                  파일 업로드
                </button>
                <input ref={prevDocRef} type="file" hidden onChange={(e) => setPrevDoc(e.target.files?.[0] ?? null)} />
                <div className={styles.fileBox}>{prevDoc ? prevDoc.name : '업로드된 파일이 없습니다.'}</div>
              </section>

              <section className={styles.section}>
                <SectionHead number={1} title="업무 개요" desc="업무에 필수적인 정보를 입력해주세요." />

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label className={styles.label}>업무명</label>
                    <MultiInput values={taskNames} onChange={setTaskNames} placeholder="입력해 주세요." />
                  </div>

                  <div className={styles.selectRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>업무 주기</label>
                      <Select value={cycle} onChange={setCycle} options={CYCLE_OPTIONS} className={styles.wide} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>중요도</label>
                      <Select value={importance} onChange={setImportance} options={IMPORTANCE_OPTIONS} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>조직/역할 선택</label>
                    <div className={styles.selectRow}>
                      <Select value={org} onChange={setOrg} options={ORG_OPTIONS} className={styles.wide} />
                      <Select value={role} onChange={setRole} options={ROLE_OPTIONS} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>주요 키워드 선택</label>
                    <div className={styles.chips}>
                      {KEYWORDS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={keywords.includes(k)}
                          className={`${styles.chip} ${keywords.includes(k) ? styles.chipOn : ''}`}
                          onClick={() => toggleKeyword(k)}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>이번 학기/기수 동안 담당했던 핵심 역할을 작성해주세요.</label>
                    <MultiInput values={coreRoles} onChange={setCoreRoles} placeholder="입력해 주세요." />
                  </div>
                </div>

                <hr className={styles.rule} />
                <p className={styles.more}>좀 더 자세한 정보를 입력해 볼까요?</p>

                <div className={styles.fields}>
                  <Question title="이번 학기/기수 동안 담당했던 직책과 한 줄 역할을 적어주세요.">
                    <GroupList items={positions} onChange={setPositions} fields={POSITION_FIELDS}
                      makeEmpty={() => ({ position: [''], role: [''] })} />
                  </Question>

                  <Question title="이번 학기/기수 동안 직접 기획하거나 운영했던 가장 중요한 행사는 무엇인가요?" hint="최소 1개를 작성해주세요.">
                    <GroupList items={events} onChange={setEvents} fields={EVENT_FIELDS}
                      makeEmpty={() => ({ name: [''], goal: [''], myRole: [''] })} />
                  </Question>

                  <Question title="주기적으로 반드시 챙겨야 했던 반복 업무는 무엇인가요?">
                    <div className={styles.field}>
                      <label className={styles.subLabel}>매주</label>
                      <MultiInput values={weekly} onChange={setWeekly} placeholder="매주 주기적으로 챙겨야 했던 반복 업무를 작성해 주세요." />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.subLabel}>매월</label>
                      <MultiInput values={monthly} onChange={setMonthly} placeholder="매월 주기적으로 챙겨야 했던 반복 업무를 작성해 주세요." />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.subLabel}>학기 시작/말</label>
                      <MultiInput values={semester} onChange={setSemester} placeholder="학기 시작/말에 주기적으로 챙겨야 했던 반복 업무를 작성해 주세요." />
                    </div>
                  </Question>

                  <Question title="특정 업무를 할 때 가장 자주 소통해야 하는 내부/외부 사람은 누구인가요?">
                    <GroupList items={contacts} onChange={setContacts} fields={CONTACT_FIELDS}
                      makeEmpty={() => ({ name: [''], type: '', role: [''] })} />
                  </Question>
                </div>
              </section>

              <Footer
                onNext={goStep1Next}
                nextEnabled={step1Valid}
                warning={showWarning && !step1Valid ? '빈칸이 있어요! 페이지를 다시 확인해 주세요.' : ''}
              />
            </>
          )}

          {step === 1 && (
            <>
              <section className={styles.section}>
                <SectionHead number={2} title="파일 첨부" desc="업무에 필수적인 파일을 첨부해 주세요." />

                <div className={styles.fields}>
                  <Question title="업무 수행에 있어 필요한 파일을 올려 주세요.">
                    <div
                      className={`${extra.dropzone} ${dragging ? extra.dropzoneOn : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                    >
                      <p className={extra.dropText}>
                        파일을 여기로 끌어오거나,{' '}
                        <button type="button" className={extra.linkBtn} onClick={() => attachRef.current?.click()}>
                          파일을 선택
                        </button>{' '}
                        해 첨부하세요.
                      </p>
                      <p className={extra.dropHint}>최대 10MB까지 첨부 가능 (PDF, PNG, JPG, JPEG, GIF, xlsx 등)</p>
                      <input
                        ref={attachRef}
                        type="file"
                        multiple
                        hidden
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.xlsx"
                        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                      />
                      <ul className={extra.fileList}>
                        {files.map((f, i) => (
                          <li key={`${f.name}-${i}`} className={extra.fileItem}>
                            <span className={extra.fileName}>{f.name}</span>
                            <span className={extra.fileSize}>{fileSizeLabel(f.size)}</span>
                            <button
                              type="button"
                              className={styles.removeBtn}
                              aria-label={`${f.name} 삭제`}
                              onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {fileError && <p className={extra.warning} role="alert">{fileError}</p>}
                  </Question>

                  <Question title="업무 수행에 있어 참고할 링크를 입력해 주세요.">
                    {LINK_FIELDS.map(({ key, label }) => (
                      <div key={key} className={styles.field}>
                        <label className={styles.subLabel}>{label}</label>
                        <MultiInput
                          values={links[key]}
                          placeholder="URL을 입력해주세요."
                          onChange={(v) => setLinks((p) => ({ ...p, [key]: v }))}
                        />
                      </div>
                    ))}
                  </Question>

                  <Question
                    title="업무 수행에 있어 아래 체크리스트를 확인해 보세요."
                    hint="모두 체크해야 다음으로 넘어갈 수 있습니다. 놓친 사항이 있다면 작성했던 내용들을 다시 확인해 보세요."
                  >
                    <ul className={extra.checklist}>
                      {CHECKLIST.map((text, i) => (
                        <li key={text}>
                          <label className={extra.checkItem}>
                            <input
                              type="checkbox"
                              checked={checks[i]}
                              onChange={() => setChecks(checks.map((c, idx) => (idx === i ? !c : c)))}
                            />
                            <span>{text}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </Question>
                </div>
              </section>

              <Footer onPrev={() => setStep(0)} onNext={goStep2Next} nextEnabled={step2Valid} />
            </>
          )}

          {step === 2 && (
            <>
              <section className={styles.section}>
                <SectionHead
                  number={3}
                  title="AI 답변 입력"
                  desc="업무에 필수적인 파일을 첨부해 주세요."
                  meta={`첨부 파일 : 총 (${files.length})건 · 답변 ${answeredBase}/${baseQuestions.length}`}
                />

                <div className={`${styles.fields} ${extra.fieldsWide}`}>
                  <p className={extra.lead}>파일 분석에 대한 아래 질문에 답변해주세요.</p>

                  {aiLoading && <p className={styles.hint}>파일을 분석해 질문을 만들고 있어요...</p>}
                  {aiError._load && (
                    <AiError
                      message={`${aiError._load} 입력한 내용은 그대로 남아 있어요.`}
                      onRetry={() => { setAiError({}); goStep2Next(); }}
                    />
                  )}

                  {questions.map((q) => {
                    const parentId = q.followUpOf ?? q.parentQuestionId;
                    const isFollow = !!parentId;
                    const resolvedParentId = parentId ?? q.id;
                    const number = baseQuestions.findIndex((x) => x.id === resolvedParentId) + 1;

                    return (
                      <div key={q.id} className={styles.field}>
                        {isFollow && (
                          <span className={extra.badge}>AI 추가 질문 {q.followUpIndex}/{MAX_FOLLOW_UP}</span>
                        )}
                        <label className={extra.qLabel}>Q. 질문 {number}</label>
                        {q.text && <p className={styles.hint}>{q.text}</p>}

                        <div onBlur={() => analyzeAnswer(q)}>
                          <MultiInput
                            multiline
                            hideAdd={isFollow}
                            values={answers[q.id] ?? ['']}
                            placeholder="입력해 주세요."
                            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                          />
                        </div>

                        {isFollow && (
                          <p className={extra.limitHint}>
                            같은 주제의 추가 질문은 최대 {MAX_FOLLOW_UP}회까지 제공돼요.
                          </p>
                        )}
                        {aiError[q.id] === 'ai' && <AiError onRetry={() => analyzeAnswer(q)} />}
                        {aiError[q.id] === 'save' && (
                          <AiError
                            message="답변을 저장하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요."
                            onRetry={() => analyzeAnswer(q)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <Footer
                onPrev={() => setStep(1)}
                onNext={goStep3Next}
                nextEnabled={step3Valid}
                loading={confirming}
                loadingLabel="저장 중..."
                warning={confirmError}
              />
            </>
          )}

          {step === 3 && (
            <>
              <section className={styles.section}>
                <SectionHead
                  number={4}
                  title="마감 설정"
                  desc="최종 검수 마감일과 후임자 전달 일정을 지정해 차질 없이 업무를 넘겨주세요."
                />

                <div className={styles.dlWrap}>
                  <div className={styles.dlBlock}>
                    <p className={styles.dlLabel}>인수인계 마감일을 지정해 주세요.</p>
                    <div className={styles.dlDateRow}>
                      <DateSelect label="년" value={closing.year} onChange={changeYear} options={yearOptions} placeholder="0000" listMax={5} />
                      <span className={styles.dlUnit}>년</span>
                      <DateSelect label="월" value={closing.month} onChange={changeMonth} options={monthOptions} placeholder="00" />
                      <span className={styles.dlUnit}>월</span>
                      <DateSelect label="일" value={closing.day} onChange={(d) => setClose({ day: d })} options={dayOptions} placeholder="00" listMax={5} />
                      <span className={styles.dlUnit}>일</span>
                      {dLabel && <strong className={styles.dlDday}>{dLabel}</strong>}
                    </div>
                    <p className={styles.dlHint}>오늘 이후 최대 31일까지 설정할 수 있어요. 이후 연장이 필요하면 관리자(회장)에게 요청하세요.</p>
                    {deadlineOutOfRange && (
                      <p className={styles.dlWarning} role="alert">선택할 수 없는 날짜예요. 오늘부터 31일 후({maxDeadline})까지 선택해 주세요.</p>
                    )}
                  </div>

                  <div className={styles.dlBlock}>
                    <p className={styles.dlLabel}>
                      인수인계서 공유를 위해 후임자의 이메일을 입력해 주세요. <span className={styles.dlOptional}>(선택)</span>
                    </p>
                    <div className={styles.dlSuccessors}>
                      {closing.successors.map((r, i) => {
                        const bad = r.email.trim() && !EMAIL_RE.test(r.email.trim());
                        return (
                          <div key={i} className={styles.dlSuccessorRow}>
                            <input
                              type="email"
                              className={`${styles.dlEmailInput} ${bad ? styles.dlInvalid : ''}`}
                              value={r.email}
                              placeholder="example@gmail.com"
                              aria-label="후임자 이메일"
                              aria-invalid={!!bad}
                              onChange={(e) => setSuccessor(i, { email: e.target.value })}
                            />
                            <input
                              type="text"
                              className={styles.dlNameInput}
                              value={r.name}
                              placeholder="이름"
                              aria-label="후임자 이름"
                              onChange={(e) => setSuccessor(i, { name: e.target.value })}
                            />
                            {closing.successors.length > 1 && (
                              <button
                                type="button"
                                className={styles.dlRowRemove}
                                aria-label="후임자 삭제"
                                onClick={() => setClose({ successors: closing.successors.filter((_, idx) => idx !== i) })}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        className={styles.dlAddBox}
                        aria-label="후임자 추가"
                        onClick={() => setClose({ successors: [...closing.successors, { email: '', name: '' }] })}
                      >
                        +
                      </button>
                    </div>
                    {!emailsValid && <p className={styles.dlWarning} role="alert">이메일 형식을 확인해 주세요.</p>}
                    {emailsValid && !successorsValid && (
                      <p className={styles.dlWarning} role="alert">후임자는 이름과 이메일을 모두 입력해 주세요.</p>
                    )}
                  </div>

                  <div className={styles.dlBlock}>
                    <p className={styles.dlLabel}>해당 인수인계의 최소 완성도 게이지를 설정해 주세요.</p>
                    <GaugeSlider
                      label="최소 완성도"
                      min={MIN_COMPLETION}
                      value={closing.completion}
                      onChange={(v) => setClose({ completion: v })}
                    />
                    <p className={styles.dlHint}>
                      완성도 = 항목 충족률 + 예외 상황 포함 + 질문 해결률 + 퀴즈 결과 (서버 자동 산출), 최소 {MIN_COMPLETION}%
                    </p>
                  </div>

                  <div className={styles.dlBlock}>
                    <p className={styles.dlLabel}>해당 인수인계의 퀴즈 정답률 커트라인을 설정해 주세요.</p>
                    <GaugeSlider
                      label="퀴즈 정답률 커트라인"
                      min={MIN_QUIZ_CUTOFF}
                      value={closing.quizCutoff}
                      onChange={(v) => setClose({ quizCutoff: v })}
                    />
                    <p className={styles.dlHint}>
                      미달 시 3일 후 재응시할 수 있어요.(10문항 기준 {Math.ceil(closing.quizCutoff / 10)}문항 이상 정답, 최소 {MIN_QUIZ_CUTOFF}%)
                    </p>
                  </div>

                  <div className={styles.dlInviteRow}>
                    <div className={styles.dlCodeBox} aria-live="polite">{closing.inviteCode}</div>
                    <button type="button" className={styles.dlCodeBtn} onClick={generateCode} disabled={codeLoading}>
                      {codeLoading ? '생성 중...' : '초대 코드 생성'}
                    </button>
                  </div>
                  {codeError && <p className={styles.dlWarning} role="alert">{codeError}</p>}
                </div>
              </section>

              <Footer
                onPrev={() => setStep(2)}
                onNext={handleSubmit}
                nextLabel="생성하기"
                nextEnabled={step4Valid}
                loading={submitting}
                warning={submitError}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}