import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Signup.module.css';
import airplaneImg from '../assets/images/login-airplane.svg';
import mainlogo from '../assets/images/Main_black_logo.svg';
import { signup } from '../api/auth';

// API 명세(POST /api/auth/signup)와 같은 규칙
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 255;
// 8–64자, 영문과 숫자를 각각 하나 이상 포함
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
const PASSWORD_MAX = 64;
const NAME_MAX = 50;

const INITIAL_VALUES = { email: '', password: '', passwordConfirm: '', name: '' };

function validateField(name, values) {
  const value = values[name];
  switch (name) {
    case 'email':
      if (!value.trim()) return '이메일을 입력해 주세요.';
      if (value.trim().length > EMAIL_MAX) return `이메일은 ${EMAIL_MAX}자 이하로 입력해 주세요.`;
      if (!EMAIL_REGEX.test(value.trim())) return '올바른 이메일 형식이 아닙니다.';
      return '';
    case 'password':
      if (!value) return '비밀번호를 입력해 주세요.';
      if (!PASSWORD_REGEX.test(value)) return '영문과 숫자를 포함해 8~64자로 입력해 주세요.';
      return '';
    case 'passwordConfirm':
      if (!value) return '비밀번호를 한 번 더 입력해 주세요.';
      if (value !== values.password) return '비밀번호가 일치하지 않습니다.';
      return '';
    case 'name':
      if (!value.trim()) return '이름을 입력해 주세요.';
      if (value.trim().length > NAME_MAX) return `이름은 ${NAME_MAX}자 이하로 입력해 주세요.`;
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
  const [formError, setFormError] = useState(''); // 특정 칸이 아닌 전체 에러 (서버 오류 등)

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' })); // 다시 입력하면 해당 필드 에러 해제
    setFormError('');
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
    setFormError('');
    try {
      await signup({
        email: values.email.trim(),
        password: values.password,
        name: values.name.trim(),
      });
      // 가입 완료 → 로그인 화면으로 (가입한 이메일을 넘겨 두면 로그인 칸에 미리 채울 수 있음)
      navigate('/login', { state: { signupEmail: values.email.trim() } });
    } catch (err) {
      // 서버 응답 형식: { code, message, errors: [{ field, message }] }
      const errorData = err.response?.data;
      if (!errorData) {
        setFormError(
          err.response
            ? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
            : '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.',
        );
        return;
      }
      if (errorData.code === 'DUPLICATE_EMAIL') {
        setErrors({ email: '이미 가입된 이메일입니다.' });
        document.getElementById('signup-email')?.focus();
        return;
      }
      // 400 INVALID_INPUT: 서버가 알려준 칸에 에러 표시
      const serverErrors = {};
      (errorData.errors ?? []).forEach(({ field, message }) => {
        if (field in INITIAL_VALUES && !serverErrors[field]) serverErrors[field] = message;
      });
      const known = Object.keys(serverErrors);
      if (known.length > 0) {
        setErrors(serverErrors);
        document.getElementById(`signup-${known[0]}`)?.focus();
        return;
      }
      setFormError(errorData.message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasError = Object.values(errors).some(Boolean) || Boolean(formError);

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
                  maxLength={EMAIL_MAX}
                />
                <TextField
                  {...fieldProps('password')}
                  label="비밀번호"
                  type="password"
                  placeholder="영문, 숫자 포함 8자 이상"
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX}
                />
                <TextField
                  {...fieldProps('passwordConfirm')}
                  label="비밀번호 확인"
                  type="password"
                  placeholder="비밀번호를 한 번 더 입력해주세요"
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX}
                />
                <TextField
                  {...fieldProps('name')}
                  label="이름"
                  type="text"
                  placeholder="실명을 입력해 주세요"
                  autoComplete="name"
                  maxLength={NAME_MAX}
                />
              </div>

              <div className={styles.submitArea}>
                <button
                  type="submit"
                  className={`${styles.submit} ${isLoading ? styles.loading : ''} ${hasError ? styles.submitError : ''}`}
                  disabled={isLoading}
                  aria-busy={isLoading || undefined}
                >
                  {isLoading ? '가입 중…' : '회원가입'}
                </button>
                {formError && (
                  <p className={styles.formError} role="alert">
                    {formError}
                  </p>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
