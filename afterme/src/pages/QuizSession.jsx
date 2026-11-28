import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import QuizNumber from '../components/QuizNumber';
import QuizOption from '../components/QuizOption';
import QuizQuestionCard from '../components/QuizQuestionCard';
import styles from './QuizSession.module.css';
import CheckIcon from '../assets/images/Quiz_check.svg';
import {
  startAttempt,
  getAttemptQuestions,
  submitAttempt,
  questionTypeLabel,
  isQuizConflict,
  isQuizForbidden,
} from '../api/quiz';
import { useApi } from '../hooks/useApi';

function QuizSession() {
  const { projectId, quizSetId } = useParams();

  // 화면에 들어오면 응시를 시작(POST)하고, 발급된 attemptId로 문항을 조회한다.
  // 제출하지 않은 응시가 있으면 서버가 그 응시를 돌려주므로, 시작 요청이 두 번 가도 응시는 하나만 생긴다.
  const { data, error } = useApi(
    () =>
      startAttempt(projectId, quizSetId).then(async ({ attemptId }) => ({
        attemptId,
        quizSet: await getAttemptQuestions(projectId, quizSetId, attemptId),
      })),
    [projectId, quizSetId],
  );

  if (isQuizConflict(error)) return <p>아직 다시 응시할 수 없어요. 재응시 가능일 이후에 다시 시도해 주세요.</p>;
  if (isQuizForbidden(error)) return <p>퀴즈는 후임자만 응시할 수 있어요.</p>;
  if (error) return <p>퀴즈를 불러오지 못했어요.</p>;
  if (!data) return null;
  return <QuizSessionView quizSet={data.quizSet} attemptId={data.attemptId} />;
}

function QuizSessionView({ quizSet, attemptId }) {
  const { teamName, passingScore, questions } = quizSet;
  const navigate = useNavigate();
  const { projectId, quizSetId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({ });
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const total = questions.length;
  const current = questions[currentIndex];
  const isAnswered = (q) => answers[q.id] !== undefined && answers[q.id] !== '';
  const answeredCount = questions.filter(isAnswered).length;
  const choiceCount = questions.filter((q) => q.type === 'choice').length;
  const shortCount = total - choiceCount;

  const allAnswered = answeredCount === total;
  const currentAnswered = isAnswered(current);

  const setAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    setShowError(false);
  };

  const goTo = (index) => {
    setCurrentIndex(Math.min(Math.max(index, 0), total - 1));
    setShowError(false);
  };

  const handleNext = () => {
    // 답을 선택하지 않고 넘어가려 하면 안내 문구를 보여준다.
    if (!currentAnswered) {
      setShowError(true);
      return;
    }
    goTo(currentIndex + 1);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitAttempt(projectId, quizSetId, attemptId, answers);
      navigate(`/handovers/${projectId}/quizzes/${quizSetId}/attempts/${attemptId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const summary = [
    teamName && `${teamName} 인수인계`,
    // 한 유형만 있으면 괄호 안 내역은 생략한다 (지금 서버는 객관식만 만든다)
    choiceCount && shortCount ? `총 ${total}문항 (객관식 ${choiceCount}, 단답형 ${shortCount})` : `총 ${total}문항`,
    `통과 기준 ${passingScore}%`,
  ]
    .filter(Boolean)
    .join(' · ');

  const getVariant = (q, index) => {
    if (index === currentIndex) return 'current';
    return isAnswered(q) ? 'answered' : 'default';
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>퀴즈</h1>

      <div className={styles.summary}>
        <img src={CheckIcon} alt="" className={styles.summaryIcon} />
        <p className={styles.summaryText}>{summary}</p>
      </div>

      <div className={styles.body}>
        <aside className={styles.side}>
          <div className={styles.numbers}>
            <p className={styles.label}>문항</p>
            <div className={styles.numberGrid}>
              {questions.map((q, index) => (
                <QuizNumber
                  key={q.id}
                  number={index + 1}
                  variant={getVariant(q, index)}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
          </div>

          <div className={styles.progress}>
            <p className={styles.progressText}>{answeredCount}/{total} 답변 완료</p>
            <ProgressBar value={(answeredCount / total) * 100} />
          </div>
        </aside>

        <section className={styles.main}>
          <QuizQuestionCard
            number={currentIndex + 1}
            typeLabel={questionTypeLabel(current)}
            text={current.text}
            error={showError}
          >
            {current.type === 'choice' ? (
              <div className={styles.options} role="radiogroup">
                {current.options.map((option, index) => (
                  <QuizOption
                    key={option}
                    text={option}
                    selected={answers[current.id] === index}
                    onClick={() => setAnswer(index)}
                  />
                ))}
              </div>
            ) : (
              <input
                className={styles.shortInput}
                type="text"
                placeholder="답을 입력하세요"
                value={answers[current.id] ?? ''}
                onChange={(e) => setAnswer(e.target.value)}
              />
            )}
          </QuizQuestionCard>

          <div className={styles.navWrap}>
            <p className={styles.errorText} role="alert">
              {showError ? '답을 선택해 주세요.' : ''}
            </p>
            <div className={styles.nav}>
              <Button
                text="이전 문제"
                variant="white"
                className={styles.navButton}
                onClick={() => goTo(currentIndex - 1)}
              />
              {allAnswered ? (
                <Button
                  text="제출하기"
                  variant="primary"
                  className={styles.navButton}
                  onClick={handleSubmit}
                />
              ) : (
                <Button
                  text="다음 문제"
                  variant={currentAnswered ? 'primary' : 'deactivate'}
                  className={styles.navButton}
                  onClick={handleNext}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default QuizSession;
