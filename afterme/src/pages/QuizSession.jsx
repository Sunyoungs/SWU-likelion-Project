import React, { useState } from 'react';
import Button from '../components/Button';
import QuizNumber from '../components/QuizNumber';
import QuizOption from '../components/QuizOption';
import styles from './QuizSession.module.css';
import CheckIcon from '../assets/images/Quiz_check.svg';

// TODO: API 연동 시 교체. teamName은 비워두고, passingScore는
// 선임자가 슬라이더로 설정한 통과 기준 값이 내려오도록 연결한다.
const quizSet = {
  teamName: '',
  passingScore: 80,
  questions: [
    { id: 1, type: 'choice', category: '상황형', text: '질문 1', options: ['보기 1', '보기 2', '보기 3', '보기 4'] },
    { id: 2, type: 'choice', category: '상황형', text: '질문 2', options: ['보기 1', '보기 2', '보기 3', '보기 4'] },
    {
      id: 3, type: 'choice', category: '상황형', text: '질문 3', options: ['보기 1', '보기 2', '보기 3', '보기 4'],
    },
    { id: 4, type: 'choice', category: '상황형', text: '질문 4', options: ['보기 1', '보기 2', '보기 3', '보기 4'] },
    { id: 5, type: 'choice', category: '상황형', text: '질문 5', options: ['보기 1', '보기 2', '보기 3', '보기 4'] },
    { id: 6, type: 'choice', category: '상황형', text: '질문 6', options: ['보기 1', '보기 2', '보기 3', '보기 4'] },
    { id: 7, type: 'choice', category: '상황형', text: '질문 7', options: ['보기 1', '보기 2', '보기 3', '보기 4'] },
    { id: 8, type: 'short', category: '지식형', text: '질문 8' },
    { id: 9, type: 'short', category: '지식형', text: '질문 9' },
    { id: 10, type: 'short', category: '지식형', text: '질문 10' },
  ],
};

const TYPE_LABEL = { choice: '객관식', short: '단답형' };

function QuizSession() {
  const { teamName, passingScore, questions } = quizSet;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({ });
  const [showError, setShowError] = useState(false);
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

  const handleSubmit = () => {
    // TODO: API 연동 시 답안 제출 후 결과 화면으로 이동
    console.log('제출', answers);
  };

  const summary = [
    teamName && `${teamName} 인수인계`,
    `총 ${total}문항 (객관식 ${choiceCount}, 단답형 ${shortCount})`,
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
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${(answeredCount / total) * 100}%` }} />
            </div>
          </div>
        </aside>

        <section className={styles.main}>
          <div className={`${styles.card} ${showError ? styles.cardError : ''}`}>
            <div className={styles.cardHead}>
              <span className={styles.qBadge}>Q{currentIndex + 1}</span>
              <span className={styles.qType}>{TYPE_LABEL[current.type]} · {current.category}</span>
            </div>
            <p className={styles.question}>{current.text}</p>

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
          </div>

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
