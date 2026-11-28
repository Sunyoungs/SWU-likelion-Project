import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Mypage.module.css';
import userIcon from '../assets/images/icon-user.svg';
import bellIcon from '../assets/images/icon-bell.svg';
import toolIcon from '../assets/images/icon-tool.svg';
import avatarImg from '../assets/images/profile-avatar.svg';
import { getMe, updateMe } from '../api/user';
import { clearTokens, logout } from '../api/auth';

const NAME_MAX = 50; // API 명세: 필수, 공백만 불가, 최대 50자

// 토큰이 없거나 만료된 경우 (API 명세: 401 UNAUTHORIZED / INVALID_ACCESS_TOKEN)
const isAuthError = (err) => err.response?.status === 401;

const NOTIFICATION_OPTIONS = [
  {
    key: 'qna',
    title: '질문 및 답변 알림',
    description: '새로운 질문이나 답변이 등록되면 알려드려요.',
  },
  {
    key: 'handoverUpdate',
    title: '인수인계 업데이트 알림',
    description: '인수인계 내용이 추가되거나 변경되면 알려드려요.',
  },
  {
    key: 'checkRequest',
    title: '확인 요청 알림',
    description: '확인하거나 완료해야 할 인수인계 항목이 생기면 알려드려요.',
  },
  {
    key: 'reminder',
    title: '리마인드 알림',
    description: '아직 완료하지 않은 질문이나 확인 항목이 있으면 다시 알려드려요.',
  },
];

const INITIAL_NOTIFICATIONS = {
  qna: true,
  handoverUpdate: true,
  checkRequest: true,
  reminder: false,
};

// 섹션 제목 (아이콘 30 + 제목 20 Bold)
function SectionTitle({ icon, children, id }) {
  return (
    <div className={styles.sectionTitle}>
      <img src={icon} alt="" width="30" height="30" />
      <h2 id={id}>{children}</h2>
    </div>
  );
}

// 알림 on/off 스위치 (피그마 tag1: 58 x 38)
function Toggle({ checked, onChange, label }) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        role="switch"
        className={styles.toggleInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className={styles.toggleTrack} aria-hidden="true">
        <span className={styles.toggleKnob} />
      </span>
    </label>
  );
}

export default function Mypage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null); // 서버에서 받은 값 { id, email, name, createdAt }
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState(''); // 입력 중인 이름
  const [nameError, setNameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  // 로그인이 풀린 경우: 토큰 지우고 로그인 화면으로
  const goLogin = useCallback(() => {
    clearTokens();
    navigate('/login');
  }, [navigate]);

  // 내 정보 불러오기
  const loadProfile = useCallback(async () => {
    setLoadError('');
    try {
      const me = await getMe();
      setProfile(me);
      setName(me.name);
    } catch (err) {
      if (isAuthError(err)) {
        goLogin();
        return;
      }
      setLoadError(
        err.response?.data?.code === 'USER_NOT_FOUND'
          ? '회원 정보를 찾을 수 없어요.'
          : '프로필 정보를 불러오지 못했어요.',
      );
    }
  }, [goLogin]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const trimmedName = name.trim();
  // 이름이 바뀌었을 때만 저장 버튼 활성화 (피그마 Deactivate → activate)
  const canSave = Boolean(profile) && trimmedName !== profile.name && !isSaving;

  const handleNameChange = (e) => {
    setName(e.target.value);
    setNameError(''); // 다시 입력하면 에러 해제
    setSaveMessage({ type: '', text: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSave) return;

    if (!trimmedName) {
      setNameError('이름을 입력해 주세요.');
      document.getElementById('mypage-name')?.focus();
      return;
    }
    if (trimmedName.length > NAME_MAX) {
      setNameError(`이름은 ${NAME_MAX}자 이하로 입력해 주세요.`);
      document.getElementById('mypage-name')?.focus();
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateMe({ name: trimmedName });
      setProfile(updated);
      setName(updated.name);
      setSaveMessage({ type: 'success', text: '저장되었습니다.' });
    } catch (err) {
      if (isAuthError(err)) {
        goLogin();
        return;
      }
      const errorData = err.response?.data;
      if (errorData?.code === 'INVALID_INPUT') {
        const nameMsg = errorData.errors?.find((x) => x.field === 'name')?.message;
        setNameError(nameMsg ?? errorData.message ?? '이름을 확인해 주세요.');
        return;
      }
      setSaveMessage({
        type: 'error',
        text: err.response ? errorData?.message ?? '저장하지 못했어요.' : '서버에 연결할 수 없어요.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key) => (checked) => {
    setNotifications((prev) => ({ ...prev, [key]: checked }));
    // TODO: 여기에 알림 설정 변경 API 호출
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 로그아웃: 서버 요청이 실패해도 토큰은 지워지므로 항상 로그인 화면으로 이동
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // 토큰은 logout() 안에서 이미 지워짐
    } finally {
      setIsLoggingOut(false);
      navigate('/login');
    }
  };

  const handleWithdraw = async () => {
    const ok = window.confirm(
      '정말 탈퇴하시겠어요?\n작성한 인수인계서와 Q&A는 동아리(조직)에 그대로 남아요.',
    );
    if (!ok) return;
    // TODO: 여기에 회원 탈퇴 API 호출
    navigate('/login');
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>프로필 설정</h1>

      <div className={styles.sections}>
        {/* 프로필 정보 */}
        <section className={styles.section} aria-labelledby="mypage-profile">
          <SectionTitle icon={userIcon} id="mypage-profile">
            프로필 정보
          </SectionTitle>

          <form className={`${styles.box} ${styles.profileBox}`} onSubmit={handleSave} noValidate>
            <div className={styles.profileHead}>
              <img className={styles.avatar} src={avatarImg} alt="" width="123" height="123" />
              <div className={styles.profileSummary}>
                <p className={styles.profileName}>
                  {profile?.name ?? (loadError ? '' : '불러오는 중…')}
                </p>
                {/* TODO: 소속·역할은 내 정보 API(GET /users/me)에 없음 → 해당 API가 생기면 연결 */}
                {(profile?.organization || profile?.role) && (
                  <div className={styles.tags}>
                    {profile.organization && (
                      <div className={styles.tagItem}>
                        <span className={styles.tag}>소속</span>
                        <span className={styles.tagValue}>{profile.organization}</span>
                      </div>
                    )}
                    {profile.role && (
                      <div className={styles.tagItem}>
                        <span className={styles.tag}>역할</span>
                        <span className={styles.tagValue}>{profile.role}</span>
                      </div>
                    )}
                  </div>
                )}
                {loadError && (
                  <p className={styles.loadError} role="alert">
                    {loadError}
                    <button type="button" className={styles.retryButton} onClick={loadProfile}>
                      다시 시도
                    </button>
                  </p>
                )}
              </div>
            </div>

            <div className={styles.profileForm}>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label htmlFor="mypage-name" className={styles.fieldLabel}>
                    이름
                  </label>
                  <input
                    id="mypage-name"
                    type="text"
                    className={styles.fieldInput}
                    value={name}
                    onChange={handleNameChange}
                    autoComplete="name"
                    maxLength={NAME_MAX}
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? 'mypage-name-error' : undefined}
                    disabled={!profile || isSaving}
                  />
                  {nameError && (
                    <p id="mypage-name-error" className={styles.fieldError} role="alert">
                      {nameError}
                    </p>
                  )}
                </div>
                <div className={styles.field}>
                  <label htmlFor="mypage-email" className={styles.fieldLabel}>
                    이메일
                  </label>
                  <input
                    id="mypage-email"
                    type="email"
                    className={styles.fieldInput}
                    value={profile?.email ?? ''}
                    readOnly
                    aria-readonly="true"
                    title="이메일은 변경할 수 없어요."
                  />
                </div>
              </div>

              <div className={styles.saveArea}>
                <p
                  className={`${styles.saveMessage} ${saveMessage.type === 'error' ? styles.saveMessageError : ''}`}
                  role="status"
                >
                  {saveMessage.text}
                </p>
                <button type="submit" className={styles.saveButton} disabled={!canSave}>
                  {isSaving ? '저장 중…' : '저장'}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* 알림 설정 */}
        <section className={styles.section} aria-labelledby="mypage-notification">
          <SectionTitle icon={bellIcon} id="mypage-notification">
            알림 설정
          </SectionTitle>

          <ul className={`${styles.box} ${styles.list}`}>
            {NOTIFICATION_OPTIONS.map((option) => (
              <li key={option.key} className={styles.row}>
                <div className={styles.rowText}>
                  <p className={styles.rowTitle}>{option.title}</p>
                  <p className={styles.rowDesc}>{option.description}</p>
                </div>
                <Toggle
                  checked={notifications[option.key]}
                  onChange={handleToggle(option.key)}
                  label={option.title}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* 계정 관리 */}
        <section className={styles.section} aria-labelledby="mypage-account">
          <SectionTitle icon={toolIcon} id="mypage-account">
            계정 관리
          </SectionTitle>

          <div className={`${styles.box} ${styles.accountBox}`}>
            <div className={`${styles.row} ${styles.rowAccount}`}>
              <div className={styles.rowText}>
                <p className={styles.accountTitle}>로그아웃</p>
                <p className={styles.accountDesc}>이 기기에서 로그아웃해요.</p>
              </div>
              <button
                type="button"
                className={styles.logoutButton}
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? '로그아웃 중…' : '로그아웃'}
              </button>
            </div>
            <div className={`${styles.row} ${styles.rowAccount}`}>
              <div className={styles.rowText}>
                <p className={styles.accountTitle}>회원 탈퇴</p>
                <p className={styles.accountDesc}>
                  탈퇴해도 작성한 인수인계서와 Q&amp;A는 동아리(조직) 소유로 남아 전임자가 나가도
                  후임자는 계속 열람할 수 있어요.
                </p>
              </div>
              <button type="button" className={styles.withdrawButton} onClick={handleWithdraw}>
                회원 탈퇴
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
