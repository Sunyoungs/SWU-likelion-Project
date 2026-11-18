import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import airplaneImg from '../assets/images/login-airplane.svg';
import mainlogo from '../assets/images/Main_black_logo.svg';

// TODO: 서버 연동 시 삭제하고 실제 로그인 API로 교체 (테스트용 임시 계정)
const MOCK_ACCOUNT = { email: 'seoyeon.park@likelion.ac.kr', password: 'password1!' };

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // 값이 있으면 에러 상태: 핑크 테두리 + 메시지
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    setError(''); // 다시 입력하면 에러 해제
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    // TODO: 여기에 로그인 API 호출
    await new Promise((resolve) => setTimeout(resolve, 600));
    const matched = email.trim() === MOCK_ACCOUNT.email && password === MOCK_ACCOUNT.password;
    setIsLoading(false);

    if (!matched) {
      setError('이메일 및 비밀번호가 일치하지 않습니다.');
      return;
    }
    navigate('/handovers'); // IA: 인수인계 > 인수인계 목록 (실제 경로에 맞게 수정)
  };

  const hasError = Boolean(error);

  return (
    <main className={styles.page}>
      {/* stage: 카드와 종이비행기를 한 덩어리로 묶어, 화면 너비와 상관없이 피그마와 같은 위치 관계 유지 */}
      <div className={styles.stage}>
        <div className={styles.plane} aria-hidden="true">
          <img className="plane" src={airplaneImg} alt="로고 아이콘" />
        </div>

        <section className={`${styles.card} ${hasError ? styles.cardError : ''}`}>
          <div className={styles.logo}>
            <img className="logo" src={mainlogo} alt="로고 아이콘" />
          </div>
          <p className={styles.service}>AI 인수인계 보조 서비스</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email" className={styles.label}>
              이메일
            </label>
            <input
              id="login-email"
              type="email"
              className={styles.input}
              value={email}
              onChange={handleChange(setEmail)}
              autoComplete="email"
              aria-invalid={hasError}
              disabled={isLoading}
            />

            <label htmlFor="login-password" className={`${styles.label} ${styles.labelGap}`}>
              비밀번호
            </label>
            <input
              id="login-password"
              type="password"
              className={styles.input}
              value={password}
              onChange={handleChange(setPassword)}
              placeholder="영문, 숫자, 특수문자 포함 8자 이상"
              autoComplete="current-password"
              aria-invalid={hasError}
              disabled={isLoading}
            />

            {/* 입력창~버튼 사이 36px 자리에 에러 메시지 노출 (피그마 간격 유지) */}
            <p className={styles.error} role="alert">
              {error}
            </p>

            <button
              type="submit"
              className={`${styles.submit} ${isLoading ? styles.loading : ''} ${hasError ? styles.submitError : ''}`}
              disabled={isLoading}
            >
              로그인
            </button>
          </form>

          <p className={styles.links}>
            <Link to="/join" className={styles.link}>
              회원가입
            </Link>
            <span>또는</span>
            <Link to="/invite" className={styles.link}>
              초대 코드로 시작
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}