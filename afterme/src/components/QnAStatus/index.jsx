import React from 'react';
import styles from './QnAStatus.module.css';

// 질문 상태 배지. variant: 'unresolved'(미해결) | 'resolved'(해결됨)
const LABEL = { unresolved: '미해결', resolved: '해결됨' };

const QnAStatus = ({ variant = 'unresolved', className = '' }) => (
  <span className={`${styles.status} ${styles[variant] ?? ''} ${className}`}>{LABEL[variant]}</span>
);

export default QnAStatus;
