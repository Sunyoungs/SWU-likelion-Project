import React from 'react';
import styles from './Button.module.css';

// variant 종류: 'primary'(파란 그라데이션), 'white'(흰 바탕+테두리), 'deactivate'(회색 비활성), 'purple', 'green' 등
// type 기본값은 'button' — <form> 안에서도 의도치 않게 제출되지 않도록. 제출 버튼은 type="submit"을 명시.
// disabled: 실제로 클릭을 막는 비활성 상태 (제출 중, 조건 미충족 등)
const Button = ({
  text,
  variant = 'primary',
  onClick,
  icon,
  className = '',
  type = 'button',
  disabled = false,
  ...rest
}) => {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      className={`${styles.btn} ${styles[variant]} ${className}`}
      onClick={onClick}
    >
      {icon && <span className={styles.iconWrapper}>{icon}</span>}
      {text}
    </button>
  );
};

export default Button;
