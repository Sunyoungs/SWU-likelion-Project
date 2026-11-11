import React from 'react';
import styles from './Tag.module.css';

// variant 종류: 'active' 'inactive' 'outline'
const Tag = ({ text, variant = 'inactive', className = '' }) => {
  return (
    <span className={`${styles.tag} ${styles[variant]} ${className}`}>
      {text}
    </span>
  );
};

export default Tag;