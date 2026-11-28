import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Pagination from '../components/Pagination';
import ProgressBar from '../components/ProgressBar';
import styles from './QuizList.module.css';
import StatsIcon from '../assets/images/Quiz_resultStats.svg';
import BookIcon from '../assets/images/Quiz_listBook.svg';
import SendIcon from '../assets/images/Quiz_listSend.svg';
import Illust from '../assets/images/Quiz_resultIllust.png';
import { getQuizList } from '../api/quiz';
import { useApi } from '../hooks/useApi';
import { daysUntil, formatDate, formatDateTime, formatDateWithWeekday } from '../utils/date';

const PAGE_SIZE = 5;

// 퀴즈 탭 첫 화면(채점 결과 목록): 다음 응시 안내 카드 + 응시 기록 카드 목록
function QuizList() {
  const { projectId } = useParams();
  const { data: quizzes, error } = useApi(() => getQuizList(projectId), [projectId]);

  if (error) return <p>퀴즈 정보를 불러오지 못했어요.</p>;
  if (!quizzes) return null;

  // 지금은 프로젝트당 퀴즈 세트가 하나다.
  const quiz = quizzes[0];
  if (!quiz) return <p className={styles.empty}>아직 만들어진 퀴즈가 없어요.</p>;
  return <QuizListView quiz={quiz} />;
}

function QuizListView({ quiz }) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [page, setPage] = useState(1);
  const { teamName, questionCount, passingScore, attempts, nextAttempt } = quiz;
  const basePath = `/handovers/${projectId}/quizzes/${quiz.id}/attempts`;
  const passCount = Math.ceil((questionCount * passingScore) / 100);

  const latest = attempts[0];
  const subtitle = latest
    ? [teamName && `${teamName} 인수인계`, `${formatDateTime(latest.submittedAt)} 제출`, `${latest.round}회차`]
        .filter(Boolean)
        .join(' · ')
    : '인수인계서 내용을 얼마나 이해했는지 확인해요';

  const totalPages = Math.max(Math.ceil(attempts.length / PAGE_SIZE), 1);
  const pageItems = attempts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div className={styles.head}>
          {/* 아직 응시 기록이 없으면 '채점 결과' 대신 사이드바 메뉴와 같은 이름 (시안 없음) */}
          <h1 className={styles.title}>{latest ? '채점 결과 목록' : '인수인계 퀴즈'}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {nextAttempt && (
          <NextAttemptCard
            next={nextAttempt}
            questionCount={questionCount}
            passCount={passCount}
            onStart={() => navigate(basePath)}
          />
        )}
      </div>

      {attempts.length > 0 && (
        <section className={styles.results}>
          <h2 className={styles.resultsTitle}>문항별 결과</h2>
          <ul className={styles.list}>
            {pageItems.map((item) => (
              <AttemptCard
                key={item.attemptId}
                item={item}
                passCount={passCount}
                onOpen={() => navigate(`${basePath}/${item.attemptId}`)}
              />
            ))}
          </ul>
        </section>
      )}

      {attempts.length > 0 && (
        <div className={styles.pager}>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

// 다음 응시 안내: 응시 가능 시각이 지났으면 버튼을 활성화, 아니면 회색으로 둔다.
function NextAttemptCard({ next, questionCount, passCount, onStart }) {
  const available = daysUntil(next.availableAt) <= 0;
  const when = available ? '지금' : `${formatDateWithWeekday(next.availableAt)} 부터`;

  return (
    <div className={styles.nextCard}>
      <img src={Illust} alt="" className={styles.illust} />

      <div className={styles.nextBody}>
        <div className={styles.nextLabel}>
          <span className={styles.iconBox}>
            <img src={StatsIcon} alt="" className={styles.statsIcon} />
          </span>
          <span>
            {next.round}차 퀴즈 - {when} 응시할 수 있어요.
          </span>
        </div>

        <div className={styles.info}>
          <div className={styles.infoBlock}>
            <div className={styles.infoLabel}>
              <img src={BookIcon} alt="" className={styles.infoIcon} />
              <span>문항 수</span>
            </div>
            <p className={styles.infoValue}>{questionCount}문항</p>
          </div>

          <div className={styles.divider} />

          <div className={styles.infoBlock}>
            <div className={styles.infoLabel}>
              <img src={SendIcon} alt="" className={styles.infoIcon} />
              <span>통과 기준</span>
            </div>
            <p className={styles.infoValue}>
              {passCount} / {questionCount}
            </p>
          </div>
        </div>
      </div>

      <Button
        text={`${next.round}차 퀴즈 보기`}
        variant={available ? 'primary' : 'deactivate'}
        className={styles.cardButton}
        onClick={available ? onStart : undefined}
        aria-disabled={!available}
      />
    </div>
  );
}

// 응시 기록: 점수, 달성 여부, 진행 막대, 안내 문구, 결과 화면 이동
function AttemptCard({ item, passCount, onOpen }) {
  const { score, total, passed, submittedAt } = item;
  const shortage = Math.max(passCount - score, 0);

  return (
    <li className={styles.attemptCard}>
      <div className={styles.attemptBody}>
        <div className={styles.attemptLabel}>
          <span className={styles.iconBoxSmall}>
            <img src={StatsIcon} alt="" className={styles.statsIconSmall} />
          </span>
          <span>
            {item.round}차 퀴즈 결과{item.retake ? ' (재응시)' : ''} {formatDate(submittedAt)}
          </span>
        </div>
        <div className={styles.scoreRow}>
          <span className={styles.score}>
            {score} / {total}
          </span>
          <span className={`${styles.badge} ${passed ? styles.badgePassed : ''}`}>{passed ? '달성' : '미달'}</span>
        </div>
        <ProgressBar value={(score / total) * 100} />
        <p className={styles.note}>
          {passed ? `통과 기준 ${passCount} / ${total} · 기준을 채웠어요!` : `${shortage}문제만 더 맞히면 통과예요!`}
        </p>
      </div>

      <Button text="결과 보기" variant="white" className={`${styles.cardButton} ${styles.openButton}`} onClick={onOpen} />
    </li>
  );
}

export default QuizList;
