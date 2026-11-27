import React from 'react';
import styles from './ProgressBar.module.css';

// value: 0~100 (%)
// variant: 'default'(연한 파랑 트랙) 'strong'(진한 트랙, 파란 배경 위에서 사용)
const ProgressBar = ({ value = 0, variant = 'default', className = '' }) => {
  const percent = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={`${styles.track} ${styles[variant] ?? ''} ${className}`}
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
