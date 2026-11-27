import base from './HandoverCreate.module.css';
import styles from './HandoverGenerating.module.css';

export default function HandoverGenerating({
  progress,
  interviewCount,
  fileCount,
  total = 6,
  error = false,
  onRetry,
}) {
  const steps = [
    `인터뷰 답변 ${interviewCount}건 분석`,
    `첨부 자료 ${fileCount}건 내용 추출`,
    `항목별 초안 작성(${progress.drafted}/${total})`,
    '스키마 검증 · 근거',
  ];

  return (
    <div className={base.page}>
      <header className={base.header}>
        <h1 className={base.title}>인수인계서 생성</h1>
        <p className={base.subtitle}>새로운 인수인계서를 생성합니다. 아래에 필요한 내용을 채워 넣어주세요.</p>
      </header>

      <div className={styles.center} role="status" aria-live="polite">
        <h2 className={styles.title}>AI가 인수인계서를 생성 중입니다.</h2>
        <p className={styles.sub}>잠시만 기다려 주세요. 평균 30초 정도 걸려요.</p>

        <ol className={styles.panel}>
          {steps.map((label, i) => {
            const state = i < progress.done ? 'done' : i === progress.done && !error ? 'active' : 'pending';
            return (
              <li key={i} className={styles.item} data-state={state}>
                <span className={styles.box} aria-hidden="true">
                  {state === 'done' && (
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M2 6.3l2.6 2.6L10 3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={styles.label}>
                  {label}
                  <span className={styles.srOnly}>{state === 'done' ? ' (완료)' : state === 'active' ? ' (진행 중)' : ' (대기)'}</span>
                </span>
              </li>
            );
          })}
        </ol>

        {error ? (
          <div className={styles.error} role="alert">
            <span>초안 생성에 실패했어요. 작성한 내용은 그대로 저장되어 있어요.</span>
            <button type="button" className={styles.retry} onClick={onRetry}>다시 시도</button>
          </div>
        ) : (
          <p className={styles.note}>※ 원본 답변과 자료에 없는 사실은 추론해서 작성하지 않아요.</p>
        )}
      </div>
    </div>
  );
}