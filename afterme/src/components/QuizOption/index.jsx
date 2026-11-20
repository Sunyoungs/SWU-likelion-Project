import React from 'react';
import styles from './QuizOption.module.css';
import RadioOff from '../../assets/images/Quiz_radioOff.svg';
import RadioOn from '../../assets/images/Quiz_radioOn.svg';

const QuizOption = ({ text, selected = false, onClick, className = '' }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`${styles.option} ${selected ? styles.selected : ''} ${className}`}
      onClick={onClick}
    >
      <img src={selected ? RadioOn : RadioOff} alt="" className={styles.radio} />
      <span className={styles.text}>{text}</span>
    </button>
  );
};

export default QuizOption;
