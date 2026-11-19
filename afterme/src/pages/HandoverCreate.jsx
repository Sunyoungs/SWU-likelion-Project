import { useMemo, useRef, useState } from 'react';
import styles from './HandoverCreate.module.css';
import extra from './HandoverCreate.module.css';

/* ---------- 상수 ---------- */
const CYCLE_OPTIONS = ['매일', '매주', '매월', '학기 단위', '연 1회', '비정기'];
const IMPORTANCE_OPTIONS = ['상', '중', '하'];
const ORG_OPTIONS = ['기획팀', '홍보팀', '총무팀', '디자인팀', '대외협력팀'];
const ROLE_OPTIONS = ['회장', '부회장', '팀장', '팀원'];
const KEYWORDS = [
  '신입 모집', '정기 세미나', '장소 대여/대관', 'SNS 카드뉴스',
  '자료 제작', '기획서', '축제 부스', '스폰서 제휴',
];
const TOC = ['업무 개요', '파일 첨부', 'AI 답변 입력', '마감 설정'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'xlsx'];
const MAX_FOLLOW_UP = 2; // 같은 주제의 추가 질문 최대 횟수

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
};

/* ---------- 날짜 유틸 (Asia/Seoul 기준) ---------- */
const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()); // YYYY-MM-DD

const addDays = (ymd, days) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

const fileExt = (name) => name.split('.').pop().toLowerCase();
const fileSizeLabel = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(b / 1024)}KB`);

/* ---------- AI 질문 요청 (TODO: 실제 API로 교체) ---------- */
// 업로드한 파일/입력 내용을 바탕으로 AI가 질문을 만들어 주는 부분.
// 반환 형식: [{ id, text, followUpOf?: id, followUpIndex?: number }]
async function requestAiQuestions(/* { files, links, overview } */) {
  // TODO: POST /api/... 연동
  return Array.from({ length: 8 }, (_, i) => ({ id: `q${i + 1}`, text: `질문 ${i + 1}` }));
}
// 답변 기반 추가 질문 요청. 없으면 null
async function requestFollowUp(/* question, answer */) {
  // TODO: 연동
  return null;
}

/* ---------- 작은 재사용 컴포넌트 ---------- */

/** 값이 여러 개 늘어날 수 있는 입력 목록 (추가 버튼 포함) */
function MultiInput({ values, onChange, placeholder, small = false, multiline = false }) {
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
      <div className={styles.addRow}>
        <button type="button" className={`${styles.addBtn} ${small ? styles.addBtnSmall : ''}`} onClick={add}>
          추가
        </button>
      </div>
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

/** 테두리 박스 안에 필드 묶음을 가지는 반복 그룹 */
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

function SectionHead({ number, title, desc }) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>
        <span>{number}.</span> {title}
      </h2>
      <p className={styles.sectionDesc}>{desc}</p>
    </div>
  );
}

function Footer({ onPrev, onNext, nextLabel = '다음', nextEnabled = true, warning, loading }) {
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
          {loading ? '생성 중...' : nextLabel}
        </button>
      </div>
    </div>
  );
}

/* ---------- 필드 정의 ---------- */
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

const hasText = (arr) => arr.some((v) => v.trim());

/* ---------- 페이지 ---------- */
/**
 * props
 * - organizationId : 현재 조직 ID (필수)
 * - accessToken    : Bearer 토큰 (필수)
 * - members        : 조직의 활성 구성원 [{ id, name }] → 전임자 선택용
 * - onCreated(project) : 생성 성공(201) 후 호출. data = Project
 */
export default function HandoverCreate({ organizationId, accessToken, members = [], onCreated }) {
  const [step, setStep] = useState(0); // 0~3
  const [showWarning, setShowWarning] = useState(false);

  /* 1. 업무 개요 */
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

  /* 업로드된 이전 인수인계서 (1단계 상단) */
  const prevDocRef = useRef(null);
  const [prevDoc, setPrevDoc] = useState(null);

  /* 2. 파일 첨부 */
  const attachRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [links, setLinks] = useState({ notion: [''], drive: [''], figma: [''], etc: [''] });
  const [checks, setChecks] = useState(CHECKLIST.map(() => false));

  /* 3. AI 답변 */
  const [questions, setQuestions] = useState([]); // [{ id, text, followUpIndex? }]
  const [answers, setAnswers] = useState({}); // { [id]: string[] }
  const [aiError, setAiError] = useState({}); // { [id]: true }
  const [aiLoading, setAiLoading] = useState(false);

  /* 4. 마감 설정 */
  const today = seoulToday();
  const maxDeadline = addDays(today, 31);
  const [deadline, setDeadline] = useState('');
  const [predecessorIds, setPredecessorIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const toggleKeyword = (k) =>
    setKeywords((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  /* ---------- 검증 ---------- */
  const step1Valid = useMemo(
    () => hasText(taskNames) && !!cycle && !!importance && !!org && !!role,
    [taskNames, cycle, importance, org, role]
  );
  const step2Valid = checks.every(Boolean);
  const answeredCount = questions.filter((q) => hasText(answers[q.id] ?? [''])).length;
  const step3Valid = questions.length > 0 && answeredCount === questions.length;
  const deadlineValid = !!deadline && deadline >= today && deadline <= maxDeadline;
  const step4Valid = deadlineValid && predecessorIds.length > 0;

  /* ---------- 파일 처리 ---------- */
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

  /* ---------- 단계 이동 ---------- */
  const goStep1Next = () => {
    if (!step1Valid) return setShowWarning(true);
    setShowWarning(false);
    setStep(1);
  };

  const goStep2Next = async () => {
    if (!step2Valid) return;
    setStep(2);
    if (questions.length === 0) {
      setAiLoading(true);
      try {
        const qs = await requestAiQuestions({ files, links, taskNames });
        setQuestions(qs);
        setAnswers(Object.fromEntries(qs.map((q) => [q.id, ['']])));
      } catch {
        setAiError({ _load: true });
      } finally {
        setAiLoading(false);
      }
    }
  };

  /** 답변 입력 후 AI 추가 질문 요청 / 실패 시 다시 시도 */
  const analyzeAnswer = async (q) => {
    const followCount = questions.filter((x) => x.followUpOf === q.id).length;
    if (followCount >= MAX_FOLLOW_UP || !hasText(answers[q.id] ?? [''])) return;
    try {
      const follow = await requestFollowUp(q, answers[q.id]);
      setAiError((e) => ({ ...e, [q.id]: false }));
      if (follow) {
        const nq = { ...follow, followUpOf: q.id, followUpIndex: followCount + 1 };
        setQuestions((prev) => {
          const i = prev.findIndex((x) => x.id === q.id);
          // 같은 주제의 마지막 추가 질문 바로 뒤에 삽입
          let end = i;
          while (prev[end + 1]?.followUpOf === q.id) end += 1;
          return [...prev.slice(0, end + 1), nq, ...prev.slice(end + 1)];
        });
        setAnswers((a) => ({ ...a, [nq.id]: [''] }));
      }
    } catch {
      setAiError((e) => ({ ...e, [q.id]: true }));
    }
  };

  /* ---------- 최종 제출: POST /api/handovers ---------- */
  const handleSubmit = async () => {
    if (!step4Valid || submitting) return;
    setSubmitting(true);
    setSubmitError('');

    const body = {
      organizationId,
      title: taskNames.map((v) => v.trim()).filter(Boolean).join(', '),
      roleName: `${org} ${role}`.trim(),
      deadline, // YYYY-MM-DD
      predecessorMemberIds: [...new Set(predecessorIds)], // 중복 제거
    };

    try {
      const res = await fetch('/api/handovers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 201) {
        const { data } = await res.json(); // Project
        onCreated?.(data);
        return;
      }
      setSubmitError(API_ERROR_MESSAGE[res.status] ?? '인수인계서를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } catch {
      setSubmitError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- 렌더 ---------- */
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>인수인계서 생성</h1>
        <p className={styles.subtitle}>새로운 인수인계서를 생성합니다. 아래에 필요한 내용을 채워 넣어주세요.</p>
      </header>

      <div className={styles.body}>
        {/* 목차 */}
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
          {/* ===== 1. 업무 개요 ===== */}
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

          {/* ===== 2. 파일 첨부 ===== */}
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

          {/* ===== 3. AI 답변 입력 ===== */}
          {step === 2 && (
            <>
              <section className={styles.section}>
                <SectionHead number={3} title="AI 답변 입력" desc="업무에 필수적인 파일을 첨부해 주세요." />
                <p className={extra.meta}>
                  첨부 파일 : 총 ({files.length})건 · 답변 {answeredCount}/{questions.length}
                </p>

                <div className={styles.fields}>
                  <p className={styles.label}>파일 분석에 대한 아래 질문에 답변해주세요.</p>

                  {aiLoading && <p className={extra.meta}>파일을 분석해 질문을 만들고 있어요...</p>}
                  {aiError._load && (
                    <div className={extra.aiError} role="alert">
                      <span>AI 분석에 실패했어요. 작성한 답변은 그대로 저장되어 있어요.</span>
                      <button type="button" className={extra.retryBtn} onClick={() => { setAiError({}); goStep2Next(); }}>
                        다시 시도
                      </button>
                    </div>
                  )}

                  {questions.map((q, idx) => {
                    const number = questions.slice(0, idx + 1).filter((x) => !x.followUpOf).length;
                    const isFollow = !!q.followUpOf;
                    return (
                      <div key={q.id} className={styles.field}>
                        {isFollow && <span className={extra.badge}>AI 추가 질문 {q.followUpIndex}/{MAX_FOLLOW_UP}</span>}
                        <label className={styles.label}>Q. {isFollow ? q.text : `질문 ${number}`}</label>
                        {isFollow ? null : q.text && q.text !== `질문 ${number}` && <p className={styles.hint}>{q.text}</p>}
                        <div onBlur={() => !isFollow && analyzeAnswer(q)}>
                          <MultiInput
                            multiline
                            values={answers[q.id] ?? ['']}
                            placeholder="입력해 주세요."
                            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                          />
                        </div>
                        {isFollow && q.followUpIndex === MAX_FOLLOW_UP && (
                          <p className={styles.hint}>같은 주제의 추가 질문은 최대 {MAX_FOLLOW_UP}회까지 제공돼요.</p>
                        )}
                        {aiError[q.id] && (
                          <div className={extra.aiError} role="alert">
                            <span>AI 분석에 실패했어요. 작성한 답변은 그대로 저장되어 있어요.</span>
                            <button type="button" className={extra.retryBtn} onClick={() => analyzeAnswer(q)}>
                              다시 시도
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <Footer onPrev={() => setStep(1)} onNext={() => step3Valid && setStep(3)} nextEnabled={step3Valid} />
            </>
          )}

          {/* ===== 4. 마감 설정 ===== */}
          {step === 3 && (
            <>
              <section className={styles.section}>
                <SectionHead number={4} title="마감 설정" desc="인수인계 마감일과 전임자를 지정해 주세요." />

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="deadline">마감일</label>
                    <input
                      id="deadline"
                      type="date"
                      className={`${styles.input} ${extra.dateInput}`}
                      value={deadline}
                      min={today}
                      max={maxDeadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                    <p className={styles.hint}>오늘부터 31일 후({maxDeadline})까지 선택할 수 있어요. (한국 시간 기준)</p>
                    {deadline && !deadlineValid && (
                      <p className={extra.warning} role="alert">선택할 수 없는 날짜예요. 허용 기간 안에서 선택해 주세요.</p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <span className={styles.label}>전임자 선택</span>
                    <p className={styles.hint}>한 명 이상 선택해 주세요. 후임자는 다음 단계에서 등록해요.</p>
                    {members.length === 0 ? (
                      <p className={styles.hint}>선택할 수 있는 조직 구성원이 없어요.</p>
                    ) : (
                      <ul className={extra.checklist}>
                        {members.map((m) => (
                          <li key={m.id}>
                            <label className={extra.checkItem}>
                              <input
                                type="checkbox"
                                checked={predecessorIds.includes(m.id)}
                                onChange={() =>
                                  setPredecessorIds((prev) =>
                                    prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                                  )
                                }
                              />
                              <span>{m.name}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              <Footer
                onPrev={() => setStep(2)}
                onNext={handleSubmit}
                nextLabel="인수인계서 생성"
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
