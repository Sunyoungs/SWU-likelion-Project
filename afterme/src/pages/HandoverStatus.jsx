import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import CalendarImg from '../assets/images/card_date.svg';
import ChartImg from '../assets/images/card_chart.svg';
import PlaneImg from '../assets/images/card_plane.svg';
import FlagImg from '../assets/images/card_flag.svg';
import WarningImg from '../assets/images/card_warning.svg';
import CheckImg from '../assets/images/card_status.svg';
import { fetchHandoverDetail, fetchHandoverStatus } from '../api/handoverApi';
import { HANDOVER_STATUS } from '../utils/handoverFormat';
import styles from './HandoverStatus.module.css';

const TARGET_PATH = {
  QNA: 'questions',
  TASK: 'tasks/create',
  DOCUMENT: 'documents',
  QUIZ: 'quizzes',
};

const pad = (n) => String(n).padStart(2, '0');
const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

const startOfDay = (value) => {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const formatMonthDay = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

const getDdayText = (deadline, status) => {
  if (status === HANDOVER_STATUS.COMPLETED) return '완료';
  if (!deadline) return '-';
  const diff = Math.round((startOfDay(deadline) - startOfDay(new Date())) / 86400000);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-DAY';
  return `D+${-diff}`;
};

const buildTimeline = (milestones) => {
  const today = startOfDay(new Date());
  const sorted = milestones
    .filter((m) => m.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const done = sorted.filter((m) => startOfDay(m.date) <= today).map((m) => ({ ...m, state: 'done' }));
  const todo = sorted.filter((m) => startOfDay(m.date) > today).map((m) => ({ ...m, state: 'todo' }));
  return [...done, { key: 'today', label: 'Today', date: new Date().toISOString(), state: 'today' }, ...todo];
};

function HandoverStatus() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const [detail, statusData] = await Promise.all([
          fetchHandoverDetail(projectId),
          fetchHandoverStatus(projectId),
        ]);
        if (cancelled) return;
        setProject(detail);
        setStatus(statusData);
      } catch {
        if (!cancelled) setError('인수인계 현황을 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const timeline = useMemo(() => buildTimeline(status?.milestones ?? []), [status]);

  if (loading) return <p className={styles.message}>인수인계 현황을 불러오는 중...</p>;
  if (error || !project || !status) return <p className={styles.message}>{error}</p>;

  const base = `/handovers/${projectId}`;
  const { score, targetScore, missingItems, currentStage } = status;
  const gap = Math.max(0, targetScore - score);
  const met = gap === 0;
  const ddayText = getDdayText(project.deadline, project.status);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>인수인계 현황</h1>
      <p className={styles.subtitle}>
        {project.title} · 전임자 {project.predecessor.name} → 후임자 {project.successor.name}
      </p>

      <div className={styles.cards}>
        {/* D-day */}
        <section className={styles.card} aria-labelledby="status-dday">
          <h2 id="status-dday" className={styles.cardTitle}>
            <img src={CalendarImg} alt="" width={20} height={20} />
            D-day 확인
          </h2>
          <p className={`${styles.bigNumber} ${ddayText.startsWith('D+') ? styles.overdue : ''}`}>
            {ddayText}
          </p>

          <ol className={styles.timeline} aria-label="인수인계 일정">
            {timeline.map((step) => (
              <li
                key={step.key}
                className={`${styles.step} ${styles[step.state]}`}
                aria-current={step.state === 'today' ? 'date' : undefined}
              >
                {step.state === 'today' && (
                  <img src={PlaneImg} alt="" width={28} height={28} className={styles.plane} />
                )}
                <span className={styles.dot} />
                <span className={styles.stepLabel}>
                  {step.label}
                  <br />
                  {formatMonthDay(step.date)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.card} aria-labelledby="status-score">
          <h2 id="status-score" className={styles.cardTitle}>
            <img src={ChartImg} alt="" width={20} height={20} />
            완성도 점수
          </h2>
          <p className={styles.scoreRow}>
            <strong className={styles.bigNumber}>{score}점</strong>
            <span className={styles.target}>/ 목표 {targetScore}점</span>
          </p>

          <div className={styles.gauge}>
            <div
              className={styles.bar}
              role="progressbar"
              aria-valuenow={clamp(score)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`완성도 ${score}점, 목표 ${targetScore}점`}
            >
              <div className={styles.fill} style={{ width: `${clamp(score)}%` }} />
            </div>
            <span className={styles.flag} style={{ left: `${clamp(targetScore)}%` }}>
              <img src={FlagImg} alt="" width={20} height={20} />
            </span>
            {!met && (
              <span className={styles.need} style={{ left: `${clamp(targetScore)}%` }}>
                <strong>+{gap}점</strong> 필요
              </span>
            )}
          </div>
          <p className={styles.scoreHint}>
            {met
              ? '목표 점수를 달성했어요! 인수인계를 마무리할 수 있어요.'
              : `${targetScore}점 달성 시 최종 인수인계 마무리 가능!`}
          </p>
        </section>
      </div>

      <section className={styles.missing} aria-labelledby="status-missing">
        <h2 id="status-missing" className={styles.sectionTitle}>
          보완이 필요한 항목 {missingItems.length}건
        </h2>

        {missingItems.length === 0 ? (
          <p className={styles.noMissing}>보완이 필요한 항목이 없어요.</p>
        ) : (
          <ul className={styles.missingList}>
            {missingItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.missingItem}
                  onClick={() => navigate(`${base}/${TARGET_PATH[item.target] ?? 'documents'}`)}
                >
                  <img src={WarningImg} alt="" width={20} height={20} className={styles.missingIcon} />
                  <span className={styles.missingBody}>
                    <span className={styles.missingHead}>
                      <span className={styles.categoryTag}>{item.categoryLabel}</span>
                      <strong className={styles.missingTitle}>{item.title}</strong>
                    </span>
                    <span className={styles.missingDesc}>{item.description}</span>
                  </span>
                  {item.points > 0 && <span className={styles.points}>+{item.points}점</span>}
                  <span className={styles.actionChip}>{item.actionLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.note}>항목을 누르면 해당 작성 · 응답 화면으로 바로 이동합니다.</p>
      </section>

      <div className={styles.bottom}>
        {currentStage ? (
          <button
            type="button"
            className={`${styles.stageBtn} ${currentStage.done ? styles.stageDone : ''}`}
            onClick={() => navigate(`${base}/quizzes`)}
          >
            {currentStage.label}
            {currentStage.done && <img src={CheckImg} alt="완료" width={18} height={18} />}
          </button>
        ) : (
          <span />
        )}
        <div className={styles.links}>
          <Button
            text="인수인계서 열람"
            variant="white"
            className={styles.linkBtn}
            onClick={() => navigate(`${base}/documents`)}
          />
          <Button
            text="Q&A 바로가기"
            variant="white"
            className={styles.linkBtn}
            onClick={() => navigate(`${base}/questions`)}
          />
        </div>
      </div>
    </div>
  );
}

export default HandoverStatus;