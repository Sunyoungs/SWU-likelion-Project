import React from 'react';
import styles from './Tag.module.css';

// variant 종류: 'active' 'inactive' 'outline'
const Tag = ({ text, variant = 'inactive', onClick, className = '' }) => {
  return (
    <span className={`${styles.tag} ${styles[variant]} ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {text}
    </span>
  );
};

export default Tag;