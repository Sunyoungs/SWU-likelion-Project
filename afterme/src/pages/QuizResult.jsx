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
import { getAttemptResult } from '../api/quiz';
import { useApi } from '../hooks/useApi';
import { daysUntil, formatDateTime, formatDateWithWeekday } from '../utils/date';

// 결과 화면은 단답형을 '주관식'으로 표기한다.
const RESULT_TYPE_LABEL = { choice: '객관식', short: '주관식' };

function QuizResult() {
  const { projectId, quizSetId, attemptId } = useParams();
  const { data: result, error } = useApi(
    () => getAttemptResult(projectId, quizSetId, attemptId),
    [projectId, quizSetId, attemptId],
  );

  if (error) return <p>채점 결과를 불러오지 못했어요.</p>;
  if (!result) return null;
  return <QuizResultView result={result} />;
}

function QuizResultView({ result }) {
  const navigate = useNavigate();
  const { projectId, quizSetId, attemptId } = useParams();
  const { teamName, passingScore, attempt, submittedAt, retakeAt } = result;
  const items = result.items.map((item, index) => ({
    no: index + 1,
    type: RESULT_TYPE_LABEL[item.type],
    topic: `${item.topicId}. ${item.topicName}`,
    correct: item.correct,
    note: item.aiEvaluation,
  }));

  // 남은 일수: 서버가 준 재응시 가능 시각까지 (올림). 0 이하면 지금 재응시 가능
  const retakeInDays = retakeAt ? daysUntil(retakeAt) : 0;
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
              <span className={`${styles.badge} ${passed ? styles.badgePassed : ''}`}>
                {passed ? '달성' : '미달'}
              </span>
            </div>
            <ProgressBar value={(score / total) * 100} />
            <p className={styles.note}>
              통과 기준 {passCount} / {total}
              {passed ? ' · 기준을 채웠어요!' : ` · ${shortage}문항이 부족해요`}
            </p>
          </div>

          {retakeAt && (
            <>
              <div className={styles.divider} />

              <div className={styles.retakeBlock}>
                <div className={styles.blockLabel}>
                  <img src={CalendarIcon} alt="" className={styles.calendarIcon} />
                  <span>{passed ? '다음 시험일' : '재응시 가능일'}</span>
                </div>
                <p className={styles.retakeDate}>{formatDateWithWeekday(retakeAt)}</p>
                <p className={styles.note}>
                  {passed
                    ? canRetake
                      ? '지금 2차 테스트를 응시할 수 있어요'
                      : `${retakeInDays}일 후 2차 테스트를 응시할 수 있어요`
                    : canRetake
                      ? '지금 다시 응시할 수 있어요'
                      : `${retakeInDays}일 후부터 다시 응시할 수 있어요`}
                </p>
              </div>
            </>
          )}
        </div>

        {retakeAt && (
          <Button
            text={passed ? '2차 테스트 보기' : canRetake ? '재응시' : `재응시 (${retakeInDays}일 후)`}
            variant={canRetake && !passed ? 'primary' : 'white'}
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
        <Button
          text="해설 보기"
          variant="primary"
          className={styles.explainButton}
          onClick={() => navigate(`/handovers/${projectId}/quizzes/${quizSetId}/attempts/${attemptId}/explanations`)}
        />
      </div>
    </div>
  );
}

export default QuizResult;
