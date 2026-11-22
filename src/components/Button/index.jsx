import React from 'react';
import styles from './Button.module.css';

// variant 종류: 'primary'(파란 그라데이션), 'white'(흰 바탕+테두리), 'purple', 'green' 등
const Button = ({ text, variant = 'primary', onClick, icon, className = '' }) => {
  return (
    <button 
      className={`${styles.btn} ${styles[variant]} ${className}`} 
      onClick={onClick}
    >
      {icon && <span className={styles.iconWrapper}>{icon}</span>}
      {text}
    </button>
  );
};

export default Button;