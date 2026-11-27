import React from 'react';
import styles from './QuizNumber.module.css';

// variant 종류: 'default'(미답변) 'answered'(답변 완료) 'current'(현재 문항)
// 해설 화면: 'correct' 'wrong' 'currentCorrect' 'currentWrong'
const QuizNumber = ({ number, variant = 'default', onClick, className = '' }) => {
  return (
    <button
      type="button"
      className={`${styles.number} ${styles[variant] ?? ''} ${className}`}
      onClick={onClick}
      aria-current={variant === 'current' ? 'step' : undefined}
    >
      {number}
    </button>
  );
};

export default QuizNumber;
