import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import base from './HandoverCreate.module.css';
import styles from './HandoverDraft.module.css';
import { MultiInput } from './HandoverCreate';

const TOC = ['업무 개요', '파일 첨부', 'AI 답변 입력', '마감 설정'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'xlsx'];
const LINK_LABEL = { notion: '노션', drive: '구글 드라이브', figma: '피그마', etc: '링크' };

/* HandoverList 화면의 라우트 경로 (실제 경로에 맞게 수정하세요) */
const LIST_PATH = '/handovers';

/* ---------- 유틸 ---------- */
const seoulToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const diffDays = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const fileExt = (name) => name.split('.').pop().toLowerCase();
const fileSizeLabel = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(b / 1024)}KB`);
const hasText = (arr) => arr.some((t) => t.trim());
/** 항상 입력칸이 1개 이상 있도록 보정 */
const clean = (v) => {
  const arr = (typeof v === 'string' ? [v] : v ?? []).map((t) => String(t).trim()).filter(Boolean);
  return arr.length ? arr : [''];
};

function deadlineLabel(deadline) {
  if (!deadline) return '';
  const left = diffDays(seoulToday(), deadline);
  const d = left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : `D+${-left}`;
  return `${deadline.replaceAll('-', '.')} (${d})`;
}

/**
 * 1~3단계에서 사용자가 쓴 내용을 초안 필드로 옮기고,
 * AI 초안(aiDraft)이 있으면 같은 키의 값으로 덮어써요.
 * aiDraft 형식(가정): { taskNames, cycle, importance, overview, summary, deadlines, tools,
 *   exTypes, exProcedure, exTargets, contactNames, contactRoles, contactInfos } — 문자열 또는 문자열 배열
 */
function buildInitial(s, ai) {
  const pick = (key, fallback) => clean(ai?.[key] ?? fallback);
  const tools = Object.entries(s.links).flatMap(([k, arr]) =>
    arr.filter((u) => u.trim()).map((u) => `${LINK_LABEL[k]}: ${u.trim()}`)
  );
  const namedContacts = s.contacts.filter((c) => hasText(c.name));

  return {
    taskNames: pick('taskNames', s.taskNames),
    cycle: pick('cycle', s.cycle),
    importance: pick('importance', s.importance),
    overview: pick('overview', s.coreRoles.filter((t) => t.trim()).join('\n')),
    summary: pick('summary', s.weekly.filter((t) => t.trim()).map((t) => `매주: ${t.trim()}`).join('\n')),
    deadlines: pick('deadlines', [...s.monthly, ...s.semester]),
    tools: pick('tools', tools),
    exTypes: pick('exTypes', []),
    exProcedure: pick('exProcedure', ''),
    exTargets: pick('exTargets', []),
    contactNames: pick('contactNames', namedContacts.flatMap((c) => c.name)),
    contactRoles: pick('contactRoles', namedContacts.map((c) => [c.type, ...c.role].filter(Boolean).join(' · '))),
    contactInfos: pick('contactInfos', []),
  };
}

/* ---------- 섹션 정의 ---------- */
const SECTIONS = [
  {
    title: '업무 개요',
    evidence: (c) => `근거 : AI 인터뷰 답변 ${c.interview}건, 등록 자료 ${c.files}건`,
    fields: [
      { key: 'taskNames', label: '업무명' },
      { key: 'cycle', label: '업무 주기' },
      { key: 'importance', label: '중요도' },
      { key: 'overview', label: '업무 개요 상세', multiline: true },
    ],
  },
  {
    title: '정기 업무 절차',
    evidence: (c) => `근거 : AI 인터뷰 답변 ${c.interview}건`,
    fields: [
      { key: 'summary', label: '절차 요약', multiline: true },
      { key: 'deadlines', label: '주요 마감 일정' },
      { key: 'tools', label: '관련 시스템 도구' },
    ],
  },
  {
    title: '예외 상황 대응',
    evidence: () => '근거 : 직접 작성한 답변',
    weakEvidence: '근거 : AI 인터뷰 답변 불충분, 추가 작성이 필요합니다.',
    warn: '대응 절차와 에스컬레이션 대상이 비어 있어요.',
    warnWhen: ['exProcedure', 'exTargets'],
    fields: [
      { key: 'exTypes', label: '예외 상황 유형' },
      { key: 'exProcedure', label: '대응 절차 및 조치 방법', multiline: true },
      { key: 'exTargets', label: '담당 에스컬레이션 대상' },
    ],
  },
  {
    title: '주요 연락처',
    evidence: () => '근거 : 직접 작성한 답변',
    weakEvidence: '근거 : 연락처 정보 누락, 직접 입력이 필요합니다.',
    warn: '담당자 연락처가 비어 있어요.',
    warnWhen: ['contactInfos'],
    fields: [
      { key: 'contactNames', label: '담당자 이름' },
      { key: 'contactRoles', label: '소속 및 역할' },
      { key: 'contactInfos', label: '연락처' },
    ],
  },
];

const WarnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3L1.5 21h21L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 10v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="18" r="1.2" fill="currentColor" />
  </svg>
);

/* ---------- 후임자 공개 승인 팝업 ---------- */
function PublishModal({ names, docName, deadline, busy, error, onCancel, onConfirm }) {
  const dialogRef = useRef(null);

  useEffect(() => { dialogRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const head = `${names[0]}${names.length > 1 ? ` 외 ${names.length - 1}명` : ''}`;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        tabIndex={-1}
      >
        <h2 id="publish-title" className={styles.dialogTitle}>후임자, {head}에게 공개할까요?</h2>
        <p className={styles.dialogDesc}>
          승인하면 후임자에게 인수인계서가 공개되고 즉시 알림 및 이메일이 발송돼요.
          <br />
          공개 전에는 후임자에게 초안이 보이지 않아요.
        </p>

        <dl className={styles.info}>
          <div><dt>공개 대상</dt><dd>{names.join(', ')}</dd></div>
          <div><dt>문서명</dt><dd>{docName}</dd></div>
          <div><dt>마감일</dt><dd>{deadline}</dd></div>
        </dl>

        <div className={styles.dialogNote}>
          <WarnIcon />
          <div>
            <strong>공개 후에도 보완할 수 있습니다.</strong>
            <p>공개 후 수정하면 새 버전(v1.1)으로 기록됩니다.</p>
          </div>
        </div>

        {error && <p className={styles.dialogError} role="alert">{error}</p>}

        <div className={styles.dialogBtns}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={busy}>취소</button>
          <button type="button" className={styles.confirmBtn} onClick={onConfirm} disabled={busy}>
            {busy ? '공개 중...' : '공개 승인'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 초안 화면 ---------- */
/**
 * props
 * - snapshot   : 1~4단계 입력값 (HandoverCreate가 onCreated 2번째 인자로 전달)
 * - aiDraft    : AI가 만든 초안 (없으면 null → 사용자가 쓴 내용만 채워져요)
 * - successors : [{ email, name }]  공개 대상
 * - onBack()   : 이전
 * - onSave(values, files)    : 임시저장 (async)
 * - onPublish(values, files) : 후임자 공개 승인 (async, 실패 시 Error throw)
 */
export default function HandoverDraft({ snapshot, aiDraft, successors, onBack, onSave, onPublish }) {
  const navigate = useNavigate();

  const [values, setValues] = useState(() => buildInitial(snapshot, aiDraft));
  const [files, setFiles] = useState(snapshot.files);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publishError, setPublishError] = useState('');
  const attachRef = useRef(null);

  const counts = { interview: snapshot.answeredCount, files: files.length };
  const names = successors.map((s) => s.name.trim() || s.email.trim());
  const canPublish = successors.length > 0;
  const docName = `${snapshot.title} 인수인계 v1.0`;
  const deadline = useMemo(() => deadlineLabel(snapshot.deadline), [snapshot.deadline]);

  const setKey = (key) => (v) => setValues((p) => ({ ...p, [key]: v }));
  const isEmpty = (key) => !hasText(values[key]);

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

  const handleSave = async () => {
    setSaveMsg('');
    try {
      await onSave?.(values, files);
      setSaveMsg('임시저장했어요.');
    } catch {
      setSaveMsg('임시저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  /* 취소: 팝업(반투명 오버레이 포함)을 닫고 원래 화면으로 */
  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
    setPublishError('');
  };

  /* 공개 승인: 성공하면 팝업을 닫고 HandoverList 화면으로 이동 */
  const handleConfirm = async () => {
    setBusy(true);
    setPublishError('');
    try {
      await onPublish(values, files);
      setModalOpen(false);
      navigate(LIST_PATH, { replace: true });
    } catch (e) {
      setPublishError(e?.message || '공개하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false); // 실패 시에만 해제 (성공 시엔 화면이 이동하므로 불필요)
    }
  };

  return (
    <div className={base.page}>
      <header className={base.header}>
        <h1 className={base.title}>인수인계서 생성</h1>
        <p className={base.subtitle}>새로운 인수인계서를 생성합니다. 아래에 필요한 내용을 채워 넣어주세요.</p>
      </header>

      <div className={base.body}>
        <aside className={base.toc} aria-label="목차">
          <span className={base.tocLabel}>목차</span>
          <ol className={base.tocList}>
            {TOC.map((t, i) => (
              <li key={t} className={i === 0 ? base.tocActive : ''}>{i + 1}. {t}</li>
            ))}
          </ol>
        </aside>

        <div className={base.main}>
          {SECTIONS.map((sec, i) => {
            const weak = !!sec.warnWhen && sec.warnWhen.every(isEmpty);
            return (
              <section key={sec.title} className={base.section} style={i === 0 ? { marginTop: 0 } : undefined}>
                <div className={base.sectionHead}>
                  <h2 className={base.sectionTitle}><span>{i + 1}.</span> {sec.title}</h2>
                  <p className={styles.evidence}>{weak ? sec.weakEvidence : sec.evidence(counts)}</p>
                </div>

                <div className={base.fields}>
                  {weak && <div className={styles.notice} role="alert"><WarnIcon />{sec.warn}</div>}
                  {sec.fields.map((f) => (
                    <div key={f.key} className={base.field}>
                      <label className={base.subLabel}>{f.label}</label>
                      <MultiInput
                        multiline={f.multiline}
                        hideAdd={f.multiline}
                        values={values[f.key]}
                        placeholder="입력해 주세요."
                        onChange={setKey(f.key)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* 5. 참고 자료 */}
          <section className={base.section}>
            <div className={base.sectionHead}>
              <h2 className={base.sectionTitle}><span>5.</span> 참고 자료</h2>
              <p className={styles.evidence}>근거 : 업로드 파일 {files.length}건</p>
            </div>
            <div className={base.fields}>
              <div
                className={`${base.dropzone} ${dragging ? base.dropzoneOn : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              >
                <p className={base.dropText}>
                  파일을 여기로 끌어오거나,{' '}
                  <button type="button" className={base.linkBtn} onClick={() => attachRef.current?.click()}>파일을 선택</button>{' '}
                  해 첨부하세요.
                </p>
                <p className={base.dropHint}>최대 10MB까지 첨부 가능 (PDF, PNG, JPG, JPEG, GIF, xlsx 등)</p>
                <input
                  ref={attachRef}
                  type="file"
                  multiple
                  hidden
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.xlsx"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                />
                <ul className={base.fileList}>
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className={base.fileItem}>
                      <span className={base.fileName}>{f.name}</span>
                      <span className={base.fileSize}>{fileSizeLabel(f.size)}</span>
                      <button
                        type="button"
                        className={base.removeBtn}
                        style={{ position: 'static', transform: 'none' }}
                        aria-label={`${f.name} 삭제`}
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {fileError && <p className={base.warning} role="alert">{fileError}</p>}
            </div>
          </section>

          {/* 하단 버튼 */}
          <div className={styles.footerWrap}>
            {!canPublish && (
              <p className={base.warning} role="alert">
                마감 설정에서 후임자 이메일을 입력하면 공개할 수 있어요.
              </p>
            )}
            {saveMsg && <p className={styles.saveMsg} role="status">{saveMsg}</p>}
            <div className={styles.footer}>
              <button type="button" className={base.prevBtn} onClick={onBack}>이전</button>
              <div className={styles.footerRight}>
                <button type="button" className={base.prevBtn} onClick={handleSave}>임시저장</button>
                <button
                  type="button"
                  className={`${styles.publishBtn} ${canPublish ? styles.publishOn : ''}`}
                  aria-disabled={!canPublish}
                  onClick={() => canPublish && setModalOpen(true)}
                >
                  후임자 공개 승인
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <PublishModal
          names={names}
          docName={docName}
          deadline={deadline}
          busy={busy}
          error={publishError}
          onCancel={closeModal}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}