import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import styles from './QuizResult.module.css';
import StatsIcon from '../assets/images/Quiz_resultStats.svg';
import CalendarIcon from '../assets/images/Quiz_resultCalendar.svg';
import CorrectIcon from '../assets/images/Quiz_resultCorrect.svg';
import WrongIcon from '../assets/images/Quiz_resultWrong.svg';
import Illust from '../assets/images/Quiz_resultIllust.png';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n) => String(n).padStart(2, '0');
// 2026-11-29T16:20:00 → 2026.11.29 16:20
const formatDateTime = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
// 2026-12-02T16:20:00 → 2026.12.02 (수)
const formatDateWithWeekday = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})`;
};

// TODO: API 연동 시 교체. teamName은 비워두고, passingScore는
// 선임자가 슬라이더로 설정한 통과 기준 값이 내려오도록 연결한다.
// submittedAt, retakeAt은 서버가 내려주는 ISO 시각이다. 재응시 가능일은
// 서버가 정하므로 프론트에서 제출 시각 + N일로 계산하지 않는다.
// retakeAt이 null이면(통과 등 재응시 불필요) 재응시 영역을 숨긴다.
const result = {
  teamName: '',
  passingScore: 80,
  submittedAt: new Date().toISOString(), // mock: 지금 제출
  attempt: 1,
  retakeAt: new Date(Date.now() + 3 * DAY_MS).toISOString(), // mock: 3일 뒤

  items: [
    // 유형·관련 항목·비고는 모두 예시 값 (1~7 객관식, 8~10 주관식)
    { no: 1, type: '객관식', topic: '예시', correct: true, note: 'AI 평가 : 예시' },
    { no: 2, type: '객관식', topic: '예시', correct: true, note: 'AI 평가 : 예시' },
    { no: 3, type: '객관식', topic: '예시', correct: false, note: 'AI 평가 : 예시' },
    { no: 4, type: '객관식', topic: '예시', correct: true, note: 'AI 평가 : 예시' },
    { no: 5, type: '객관식', topic: '예시', correct: true, note: 'AI 평가 : 예시' },
    { no: 6, type: '객관식', topic: '예시', correct: false, note: 'AI 평가 : 예시' },
    { no: 7, type: '객관식', topic: '예시', correct: false, note: 'AI 평가 : 예시' },
    { no: 8, type: '주관식', topic: '예시', correct: true, note: 'AI 평가 : 예시' },
    { no: 9, type: '주관식', topic: '예시', correct: true, note: 'AI 평가 : 예시' },
    { no: 10, type: '주관식', topic: '예시', correct: true, note: 'AI 평가 : 예시' },
  ],
};

function QuizResult() {
  const navigate = useNavigate();
  const { projectId, quizSetId } = useParams();
  const { teamName, passingScore, submittedAt, attempt, retakeAt, items } = result;

  // 남은 일수: 서버가 준 재응시 가능 시각까지 (올림). 0 이하면 지금 재응시 가능
  const retakeInDays = retakeAt ? Math.ceil((new Date(retakeAt) - Date.now()) / DAY_MS) : 0;
  const canRetake = retakeAt !== null && retakeInDays <= 0;

  const total = items.length;
  const score = items.filter((item) => item.correct).length;
  const passCount = Math.ceil((total * passingScore) / 100);
  const shortage = Math.max(passCount - score, 0);
  const passed = shortage === 0;

  const subtitle = [
    teamName && `${teamName} 인수인계`,
    `${formatDateTime(submittedAt)} 제출`,
    `${attempt}회차`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>채점 결과</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <div className={styles.summary}>
        <img src={Illust} alt="" className={styles.illust} />

        <div className={styles.summaryInfo}>
          <div className={styles.scoreBlock}>
            <div className={styles.blockLabel}>
              <img src={StatsIcon} alt="" className={styles.statsIcon} />
              <span>퀴즈 결과</span>
            </div>
            <div className={styles.scoreRow}>
              <span className={styles.score}>{score} / {total}</span>
              <span className={styles.badge}>{passed ? '통과' : '미달'}</span>
            </div>
            <ProgressBar value={(score / total) * 100} />
            <p className={styles.note}>
              통과 기준 {passCount} / {total}
              {passed ? ' · 기준을 충족했어요' : ` · ${shortage}문항이 부족해요`}
            </p>
          </div>

          {retakeAt && (
            <>
              <div className={styles.divider} />

              <div className={styles.retakeBlock}>
                <div className={styles.blockLabel}>
                  <img src={CalendarIcon} alt="" className={styles.calendarIcon} />
                  <span>재응시 가능일</span>
                </div>
                <p className={styles.retakeDate}>{formatDateWithWeekday(retakeAt)}</p>
                <p className={styles.note}>
                  {canRetake ? '지금 다시 응시할 수 있어요' : `${retakeInDays}일 후부터 다시 응시할 수 있어요`}
                </p>
              </div>
            </>
          )}
        </div>

        {retakeAt && (
          <Button
            text={canRetake ? '재응시' : `재응시 (${retakeInDays}일 후)`}
            variant={canRetake ? 'primary' : 'white'}
            className={styles.retakeButton}
            onClick={canRetake ? () => navigate(`/handovers/${projectId}/quizzes/${quizSetId}/attempts`) : undefined}
          />
        )}
      </div>

      <section className={styles.results}>
        <h2 className={styles.resultsTitle}>문항별 결과</h2>

        <div role="table" aria-label="문항별 결과">
          <div role="row" className={`${styles.row} ${styles.headRow}`}>
            <span role="columnheader">번호</span>
            <span role="columnheader">유형</span>
            <span role="columnheader">관련 항목</span>
            <span role="columnheader">결과</span>
            <span role="columnheader">비고</span>
          </div>

          {items.map((item) => (
            <div role="row" key={item.no} className={`${styles.row} ${styles.bodyRow}`}>
              <span role="cell">Q{item.no}</span>
              <span role="cell">{item.type}</span>
              <span role="cell">{item.topic}</span>
              <span role="cell" className={styles.resultCell}>
                <img src={item.correct ? CorrectIcon : WrongIcon} alt="" className={styles.resultIcon} />
                {item.correct ? '정답' : '오답'}
              </span>
              <span role="cell" className={styles.remark}>{item.note}</span>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.footer}>
        <Button
          text="목록으로"
          variant="white"
          className={styles.listButton}
          onClick={() => navigate(`/handovers/${projectId}/quizzes`)}
        />
        {/* TODO: 해설 화면이 정해지면 이동 연결 */}
        <Button text="해설 보기" variant="primary" className={styles.explainButton} />
      </div>
    </div>
  );
}

export default QuizResult;
