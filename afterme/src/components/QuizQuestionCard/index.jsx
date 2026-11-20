import React from 'react';
import styles from './QuizQuestionCard.module.css';

// error: true면 테두리를 분홍색으로 (답을 선택하지 않은 경우)
const QuizQuestionCard = ({ number, typeLabel, text, error = false, children, className = '' }) => {
  return (
    <div className={`${styles.card} ${error ? styles.error : ''} ${className}`}>
      <div className={styles.head}>
        <span className={styles.badge}>Q{number}</span>
        <span className={styles.type}>{typeLabel}</span>
      </div>
      <p className={styles.question}>{text}</p>
      {children}
    </div>
  );
};

export default QuizQuestionCard;
