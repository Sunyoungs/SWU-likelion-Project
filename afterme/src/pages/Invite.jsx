import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Invite.module.css';
import airplaneImg from '../assets/images/login-airplane.svg';
import mainlogo from '../assets/images/Main_black_logo.svg';

import { verifyInvitation, joinInvitation } from '../api/invitation';
import { clearTokens } from '../api/auth';

const NOT_FOUND_TEXT = '해당 초대코드는 존재하지 않습니다.';

// 서버 오류 → 화면 문구 (API 명세 verify / join)
function getInviteErrorMessage(err, step) {
  if (!err.response) return '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
  switch (err.response.status) {
    case 400:
      return '초대 코드 형식이 올바르지 않습니다.';
    case 404:
      return NOT_FOUND_TEXT;
    case 409:
      return step === 'join'
        ? '이미 사용된 코드이거나 이미 참여한 인수인계입니다.'
        : '이미 사용된 초대코드입니다.';
    default:
      return err.response.data?.message ?? '잠시 후 다시 시도해 주세요.';
  }
}

const MIN_CODE_LENGTH = 6; // 이 길이부터 자동 조회
const GUIDE_TEXT = '초대 코드를 입력해 주세요.';

export default function Invite() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState(null); // 확인된 조직 정보 { organizationId, organizationName }
  const [error, setError] = useState(''); // 값이 있으면 에러 상태: 핑크 안내문 + 핑크 버튼
  const [isLooking, setIsLooking] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const trimmed = code.trim();

  // 로그인이 필요한 API라 토큰이 없거나 만료되면 로그인 화면으로
  const goLogin = useCallback(() => {
    clearTokens();
    navigate('/login');
  }, [navigate]);

  // 입력이 멈추면(0.4초) 자동으로 코드 확인 → 초대받은 조직 표시
  useEffect(() => {
    if (trimmed.length < MIN_CODE_LENGTH) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLooking(true);
      try {
        const result = await verifyInvitation(trimmed);
        if (cancelled) return;
        setInvite(result);
        setError('');
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          goLogin();
          return;
        }
        setInvite(null);
        setError(getInviteErrorMessage(err, 'verify'));
      } finally {
        if (!cancelled) setIsLooking(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, goLogin]);

  const handleChange = (e) => {
    setCode(e.target.value);
    setInvite(null);
    setError(''); // 다시 입력하면 에러 해제
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isJoining || isLooking) return;

    if (!trimmed) {
      setError(GUIDE_TEXT);
      return;
    }

    // join 요청에서 서버가 코드를 다시 검증하므로 바로 참여 요청
    setIsJoining(true);
    try {
      const { projectId } = await joinInvitation(trimmed);
      // TODO: 인수인계 상세 화면 경로가 다르면 수정 (projectId 가 없으면 목록으로)
      navigate(projectId ? `/handovers/${projectId}` : '/handovers');
    } catch (err) {
      if (err.response?.status === 401) {
        goLogin();
        return;
      }
      setError(getInviteErrorMessage(err, 'join'));
    } finally {
      setIsJoining(false);
    }
  };

  const hasError = Boolean(error);
  const isBusy = isLooking || isJoining;

  return (
    <main className={styles.page}>
      {/* stage: 카드와 종이비행기를 한 덩어리로 묶어, 화면 너비와 상관없이 피그마와 같은 위치 관계 유지 */}
      <div className={styles.stage}>
        <div className={styles.plane} aria-hidden="true">
          <img src={airplaneImg} alt="" />
        </div>

        <section className={styles.card} aria-labelledby="invite-title">
          <h1 id="invite-title" className={styles.srOnly}>
            초대 코드로 시작
          </h1>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.content}>
              <div className={styles.brand}>
                <div className={styles.logo}>
                  <img src={mainlogo} alt="After.me" />
                </div>
                <p className={styles.service}>AI 인수인계 보조 서비스</p>
              </div>

              <div className={styles.body}>
                <p
                  className={`${styles.guide} ${hasError ? styles.guideError : ''}`}
                  role={hasError ? 'alert' : undefined}
                >
                  {error || GUIDE_TEXT}
                </p>

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label htmlFor="invite-code" className={styles.label}>
                      초대 코드
                    </label>
                    <input
                      id="invite-code"
                      name="code"
                      type="text"
                      className={styles.input}
                      value={code}
                      onChange={handleChange}
                      placeholder="LNK-00-0000"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={hasError}
                      disabled={isJoining}
                    />
                  </div>

                  <div className={styles.org} aria-live="polite">
                    <p className={styles.orgLabel}>초대받은 조직</p>
                    {invite ? (
                      <div className={styles.orgInfo}>
                        <p className={styles.orgName}>{invite.organizationName}</p>
                        {/* 확인 API 응답에 역할이 없어서, 값이 올 때만 표시 */}
                        {invite.role && <p className={styles.orgRole}>역할 : {invite.role}</p>}
                      </div>
                    ) : (
                      <div className={styles.orgEmpty}>
                        {isLooking && <span className={styles.orgLoading}>조회 중…</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={`${styles.submit} ${isJoining ? styles.loading : ''} ${hasError ? styles.submitError : ''}`}
              disabled={isBusy}
              aria-busy={isBusy || undefined}
            >
              참여하고 시작하기
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
