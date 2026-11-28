import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import QuizNumber from '../components/QuizNumber';
import QuizOption from '../components/QuizOption';
import QuizQuestionCard from '../components/QuizQuestionCard';
import styles from './QuizExplanation.module.css';
import { getAttemptResult, questionTypeLabel } from '../api/quiz';
import { useApi } from '../hooks/useApi';

function QuizExplanation() {
  const { projectId, quizSetId, attemptId } = useParams();
  const { data, error } = useApi(
    () => getAttemptResult(projectId, quizSetId, attemptId),
    [projectId, quizSetId, attemptId],
  );

  if (error) return <p>해설을 불러오지 못했어요.</p>;
  if (!data) return null;
  return <QuizExplanationView questions={data.questions} grading={data.grading} weakAreas={data.weakAreas} />;
}

function QuizExplanationView({ questions, grading, weakAreas }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { projectId, quizSetId, attemptId } = useParams();
  const isCorrect = (q) => grading[q.id].correct;
  // 문서 화면에서 돌아온 경우 보고 있던 문항을 복원한다. (state.questionId)
  const restoredIndex = questions.findIndex((q) => q.id === state?.questionId);
  const [currentIndex, setCurrentIndex] = useState(restoredIndex >= 0 ? restoredIndex : 0);
  const current = questions[currentIndex];
  const currentGrading = grading[current.id];

  const getNumberVariant = (q, index) => {
    if (index === currentIndex) return isCorrect(q) ? 'currentCorrect' : 'currentWrong';
    return isCorrect(q) ? 'correct' : 'wrong';
  };

  const getOptionVariant = (index) => {
    if (index === currentGrading.answerIndex) return 'correct';
    if (index === currentGrading.myIndex) return 'wrong';
    return 'default';
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>해설</h1>

      <div className={styles.body}>
        <aside className={styles.side}>
          <div className={styles.numbers}>
            <p className={styles.label}>문항</p>
            <div className={styles.numberGrid}>
              {questions.map((q, index) => (
                <QuizNumber
                  key={q.id}
                  number={index + 1}
                  variant={getNumberVariant(q, index)}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </div>

          <section className={styles.weakCard}>
            <h2 className={styles.weakTitle}>취약 영역 분석</h2>
            <ul className={styles.weakList}>
              {weakAreas.map(({ topicId, topicName, correct, total }) => (
                <li key={topicId} className={styles.weakItem}>
                  <div className={styles.weakRow}>
                    <span>{topicName}</span>
                    <span>{correct} / {total}</span>
                  </div>
                  <ProgressBar variant="strong" value={(correct / total) * 100} className={styles.weakBar} />
                </li>
              ))}
            </ul>
          </section>

          {/* TODO: 인수인계서 열람 화면이 만들어지면 topicId에 해당하는 섹션 위치로 이동 */}
          <Button
            text="해당 섹션 다시 읽기"
            variant="primary"
            className={styles.readButton}
            onClick={() =>
              navigate(`/handovers/${projectId}/documents`, {
                state: {
                  topicId: current.topicId,
                  sectionId: current.sectionId, // 서버가 주는 근거 섹션 id
                  returnTo: {
                    path: `/handovers/${projectId}/quizzes/${quizSetId}/attempts/${attemptId}/explanations`,
                    state: { questionId: current.id },
                  },
                },
              })
            }
          />
        </aside>

        <section className={styles.main}>
          <QuizQuestionCard
            number={currentIndex + 1}
            typeLabel={questionTypeLabel(current)}
            text={current.text}
          >
            {current.options && (
              <div className={styles.options} role="radiogroup">
                {current.options.map((option, index) => (
                  <QuizOption key={option} text={option} variant={getOptionVariant(index)} disabled />
                ))}
              </div>
            )}
          </QuizQuestionCard>

          <div className={styles.explanation}>
            <p className={styles.explanationTitle}>해설</p>
            <p className={styles.explanationText}>{currentGrading.explanation}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default QuizExplanation;
