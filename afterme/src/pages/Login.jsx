import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import airplaneImg from '../assets/images/login-airplane.svg';
import mainlogo from '../assets/images/Main_black_logo.svg';
import { login } from '../api/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 서버 에러 코드 → 화면 문구 (API 명세 POST /api/auth/login)
function getLoginErrorMessage(err) {
  const errorData = err.response?.data;
  if (!err.response) return '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
  switch (errorData?.code) {
    case 'INVALID_CREDENTIALS':
      return '이메일 및 비밀번호가 일치하지 않습니다.';
    case 'ACCOUNT_LOCKED':
      return '로그인 시도가 너무 많아 계정이 잠겼어요. 잠시 후 다시 시도해 주세요.';
    case 'INVALID_INPUT':
      return errorData.errors?.[0]?.message ?? errorData.message ?? '입력값을 확인해 주세요.';
    default:
      return errorData?.message ?? '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // 회원가입 직후라면 가입한 이메일을 미리 채워 둠
  const [email, setEmail] = useState(location.state?.signupEmail ?? '');
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

    // API 명세: 이메일 필수·형식 / 비밀번호 필수·공백만 입력 불가
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate('/handovers'); // IA: 인수인계 > 인수인계 목록 (실제 경로에 맞게 수정)
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
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