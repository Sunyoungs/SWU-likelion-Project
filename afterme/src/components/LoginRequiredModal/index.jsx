import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../Button';
import styles from './LoginRequiredModal.module.css';

// 서버가 '다시 로그인해야 한다'는 401을 주면 Layout이 띄우는 모달.
// 원래 화면은 뒤에 그대로 두어서, 닫으면 쓰던 내용을 확인하거나 복사할 수 있다.
// 로그인 화면에는 원래 있던 경로를 state.from으로 넘긴다.
function LoginRequiredModal({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.card}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        aria-describedby="login-required-desc"
      >
        <p id="login-required-title" className={styles.title}>
          로그인이 필요해요
        </p>
        <p id="login-required-desc" className={styles.desc}>
          로그인이 만료됐거나 아직 로그인하지 않았어요.
          <br />
          다시 로그인한 뒤 이어서 진행해 주세요.
        </p>
        <div className={styles.actions}>
          <Button text="닫기" variant="white" className={styles.button} onClick={onClose} />
          <Button
            text="로그인하러 가기"
            className={styles.button}
            autoFocus
            onClick={() => navigate('/login', { state: { from: location.pathname } })}
          />
        </div>
      </div>
    </div>
  );
}

export default LoginRequiredModal;
