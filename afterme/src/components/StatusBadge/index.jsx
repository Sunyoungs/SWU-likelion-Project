import React from 'react';
import styles from './StatusBadge.module.css';

const StatusBadge = ({ label, tone = 'orange' }) => (
  <span className={`${styles.badge} ${styles[tone] ?? ''}`}>{label}</span>
);

export default StatusBadge;