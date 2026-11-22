import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Signup.module.css';
import airplaneImg from '../assets/images/login-airplane.svg';
import mainlogo from '../assets/images/Main_black_logo.svg';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 영문, 숫자, 특수문자 포함 8자 이상
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

const INITIAL_VALUES = { email: '', password: '', passwordConfirm: '', name: '' };

function validateField(name, values) {
  const value = values[name];
  switch (name) {
    case 'email':
      if (!value.trim()) return '이메일을 입력해 주세요.';
      if (!EMAIL_REGEX.test(value.trim())) return '올바른 이메일 형식이 아닙니다.';
      return '';
    case 'password':
      if (!value) return '비밀번호를 입력해 주세요.';
      if (!PASSWORD_REGEX.test(value)) return '영문, 숫자, 특수문자 포함 8자 이상 입력해 주세요.';
      return '';
    case 'passwordConfirm':
      if (!value) return '비밀번호를 한 번 더 입력해 주세요.';
      if (value !== values.password) return '비밀번호가 일치하지 않습니다.';
      return '';
    case 'name':
      if (!value.trim()) return '이름을 입력해 주세요.';
      return '';
    default:
      return '';
  }
}

// 라벨 + 입력창 + 에러 메시지 (피그마 Frame 498~501)
function TextField({ label, error, id, ...inputProps }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        {...inputProps}
      />
      {hasError && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' })); // 다시 입력하면 해당 필드 에러 해제
  };

  // 입력을 마치고 벗어날 때 검사 (빈 칸은 제출 시점에만 검사)
  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (!value) return;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, values) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const nextErrors = Object.keys(INITIAL_VALUES).reduce((acc, key) => {
      const message = validateField(key, values);
      if (message) acc[key] = message;
      return acc;
    }, {});
    setErrors(nextErrors);

    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      document.getElementById(`signup-${firstInvalid}`)?.focus();
      return;
    }

    setIsLoading(true);
    // TODO: 여기에 회원가입 API 호출 (중복 이메일이면 setErrors({ email: '이미 가입된 이메일입니다.' }))
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsLoading(false);

    navigate('/login'); // 가입 완료 후 로그인 화면으로 (실제 경로에 맞게 수정)
  };

  const hasError = Object.values(errors).some(Boolean);

  const fieldProps = (name) => ({
    id: `signup-${name}`,
    name,
    value: values[name],
    error: errors[name],
    onChange: handleChange,
    onBlur: handleBlur,
    disabled: isLoading,
  });

  return (
    <main className={styles.page}>
      {/* stage: 카드와 종이비행기를 한 덩어리로 묶어, 화면 너비와 상관없이 피그마와 같은 위치 관계 유지 */}
      <div className={styles.stage}>
        <div className={styles.plane} aria-hidden="true">
          <img src={airplaneImg} alt="" />
        </div>

        <section className={styles.card} aria-labelledby="signup-title">
          <h1 id="signup-title" className={styles.srOnly}>
            회원가입
          </h1>

          <div className={styles.content}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <img src={mainlogo} alt="After.me" />
              </div>
              <p className={styles.service}>AI 인수인계 보조 서비스</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.fields}>
                <TextField
                  {...fieldProps('email')}
                  label="이메일"
                  type="email"
                  placeholder="seoyeon.park@likelion.ac.kr"
                  autoComplete="email"
                />
                <TextField
                  {...fieldProps('password')}
                  label="비밀번호"
                  type="password"
                  placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                  autoComplete="new-password"
                />
                <TextField
                  {...fieldProps('passwordConfirm')}
                  label="비밀번호 확인"
                  type="password"
                  placeholder="비밀번호를 한 번 더 입력해주세요"
                  autoComplete="new-password"
                />
                <TextField
                  {...fieldProps('name')}
                  label="이름"
                  type="text"
                  placeholder="실명을 입력해 주세요"
                  autoComplete="name"
                />
              </div>

              <button
                type="submit"
                className={`${styles.submit} ${isLoading ? styles.loading : ''} ${hasError ? styles.submitError : ''}`}
                disabled={isLoading}
                aria-busy={isLoading || undefined}
              >
                회원가입
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}