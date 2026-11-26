import React from 'react';
import { ROLE, ROLE_LABEL } from '../../utils/handoverFormat';
import styles from './RoleBadge.module.css';

const RoleBadge = ({ role, size = 'md' }) => {
  const variant = role === ROLE.PREDECESSOR ? styles.filled : styles.outline;
  return <span className={`${styles.role} ${variant} ${styles[size]}`}>{ROLE_LABEL[role] ?? '-'}</span>;
};

export default RoleBadge;
