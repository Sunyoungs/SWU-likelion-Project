import React from 'react';
import styles from './QuizOption.module.css';
import RadioOff from '../../assets/images/Quiz_radioOff.svg';
import RadioOn from '../../assets/images/Quiz_radioOn.svg';
import RadioCorrect from '../../assets/images/Quiz_radioCorrect.svg';
import RadioWrong from '../../assets/images/Quiz_radioWrong.svg';

const ICONS = {
  default: RadioOff,
  selected: RadioOn,
  correct: RadioCorrect,
  wrong: RadioWrong,
};

// variant 종류: 'default' 'selected'(내가 선택) 'correct'(정답) 'wrong'(내가 고른 오답)
// variant를 주지 않으면 selected 값으로 default/selected를 결정한다.
// disabled: 해설 화면처럼 선택할 수 없을 때
const QuizOption = ({ text, selected = false, variant, disabled = false, onClick, className = '' }) => {
  const state = variant ?? (selected ? 'selected' : 'default');
  return (
    <button
      type="button"
      role="radio"
      aria-checked={state !== 'default'}
      disabled={disabled}
      className={`${styles.option} ${styles[state] ?? ''} ${className}`}
      onClick={onClick}
    >
      <img src={ICONS[state]} alt="" className={styles.radio} />
      <span className={styles.text}>{text}</span>
    </button>
  );
};

export default QuizOption;
