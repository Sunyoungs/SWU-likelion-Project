import React from 'react';
import styles from './ProgressBar.module.css';

// value: 0~100 (%)
const ProgressBar = ({ value = 0, className = '' }) => {
  const percent = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={`${styles.track} ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  );
};

export default ProgressBar;
