import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Invite.module.css';
import airplaneImg from '../assets/images/login-airplane.svg';
import mainlogo from '../assets/images/Main_black_logo.svg';

// TODO: 서버 연동 시 삭제하고 실제 초대 코드 조회 API로 교체 (테스트용 임시 데이터)
const MOCK_INVITES = {
  'LNK-26-7QX4': {
    organization: '서울여자대학교 연합동아리 LINKER',
    role: '후임자 (26기 홍보팀)',
  },
};

const lookupInvite = async (code) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_INVITES[code] ?? null;
};

const MIN_CODE_LENGTH = 6; // 이 길이부터 자동 조회
const GUIDE_TEXT = '초대 코드를 입력해 주세요.';

export default function Invite() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState(null); // 조회된 조직 정보
  const [error, setError] = useState(''); // 값이 있으면 에러 상태: 핑크 안내문 + 핑크 버튼
  const [isLooking, setIsLooking] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const trimmed = code.trim();

  // 입력이 멈추면(0.4초) 자동으로 코드 조회 → 초대받은 조직 표시
  useEffect(() => {
    if (trimmed.length < MIN_CODE_LENGTH) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLooking(true);
      const result = await lookupInvite(trimmed);
      if (cancelled) return;
      setIsLooking(false);
      setInvite(result);
      setError(result ? '' : '해당 초대코드는 존재하지 않습니다.');
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  const handleChange = (e) => {
    setCode(e.target.value.toUpperCase());
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

    let target = invite;
    if (!target) {
      setIsLooking(true);
      target = await lookupInvite(trimmed);
      setIsLooking(false);
      setInvite(target);
    }
    if (!target) {
      setError('해당 초대코드는 존재하지 않습니다.');
      return;
    }

    setIsJoining(true);
    // TODO: 여기에 인수인계 참여 API 호출
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsJoining(false);
    navigate('/handovers'); // IA: 인수인계 > 인수인계 목록 (실제 경로에 맞게 수정)
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
                        <p className={styles.orgName}>{invite.organization}</p>
                        <p className={styles.orgRole}>역할 : {invite.role}</p>
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