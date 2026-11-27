import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Mypage.module.css';
import userIcon from '../assets/images/icon-user.svg';
import bellIcon from '../assets/images/icon-bell.svg';
import toolIcon from '../assets/images/icon-tool.svg';
import avatarImg from '../assets/images/profile-avatar.svg';

// TODO: 서버 연동 시 삭제하고 실제 내 정보 API로 교체 (테스트용 임시 데이터)
const MOCK_PROFILE = {
  name: '박서연',
  email: 'seoyeon.park@likelion.ac.kr',
  organization: 'LINKER 25기 홍보팀장',
  role: '전임자',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [profile, setProfile] = useState(MOCK_PROFILE); // 저장된 값
  const [name, setName] = useState(MOCK_PROFILE.name); // 입력 중인 값
  const [email, setEmail] = useState(MOCK_PROFILE.email);
  const [errors, setErrors] = useState({}); // { name, email } 값이 있으면 에러 표시
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const isChanged = trimmedName !== profile.name || trimmedEmail !== profile.email;
  // 이름이나 이메일이 바뀌었을 때만 저장 버튼 활성화 (피그마 Deactivate → activate)
  const canSave = isChanged && !isSaving;

  const validate = () => {
    const next = {};
    if (!trimmedName) next.name = '이름을 입력해 주세요.';
    if (!trimmedEmail) next.email = '이메일을 입력해 주세요.';
    else if (!EMAIL_REGEX.test(trimmedEmail)) next.email = '올바른 이메일 형식이 아닙니다.';
    return next;
  };

  const handleChange = (setter, key) => (e) => {
    setter(e.target.value);
    setErrors((prev) => ({ ...prev, [key]: '' })); // 다시 입력하면 해당 칸 에러 해제
    setSaveMessage('');
  };

  // 이메일 칸을 벗어날 때 형식 검사
  const handleEmailBlur = () => {
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, email: '올바른 이메일 형식이 아닙니다.' }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSave) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      document.getElementById(`mypage-${firstInvalid}`)?.focus();
      return;
    }

    setIsSaving(true);
    // TODO: 여기에 프로필 수정 API 호출
    //  - 이미 사용 중인 이메일이면 setErrors({ email: '이미 사용 중인 이메일입니다.' })
    await new Promise((resolve) => setTimeout(resolve, 500));
    setProfile((prev) => ({ ...prev, name: trimmedName, email: trimmedEmail }));
    setName(trimmedName);
    setEmail(trimmedEmail);
    setIsSaving(false);
    setSaveMessage('저장되었습니다.');
  };

  const handleToggle = (key) => (checked) => {
    setNotifications((prev) => ({ ...prev, [key]: checked }));
    // TODO: 여기에 알림 설정 변경 API 호출
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
                <p className={styles.profileName}>{profile.name}</p>
                <div className={styles.tags}>
                  <div className={styles.tagItem}>
                    <span className={styles.tag}>소속</span>
                    <span className={styles.tagValue}>{profile.organization}</span>
                  </div>
                  <div className={styles.tagItem}>
                    <span className={styles.tag}>역할</span>
                    <span className={styles.tagValue}>{profile.role}</span>
                  </div>
                </div>
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
                    onChange={handleChange(setName, 'name')}
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'mypage-name-error' : undefined}
                    disabled={isSaving}
                  />
                  {errors.name && (
                    <p id="mypage-name-error" className={styles.fieldError} role="alert">
                      {errors.name}
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
                    value={email}
                    onChange={handleChange(setEmail, 'email')}
                    onBlur={handleEmailBlur}
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'mypage-email-error' : undefined}
                    disabled={isSaving}
                  />
                  {errors.email && (
                    <p id="mypage-email-error" className={styles.fieldError} role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.saveArea}>
                <p className={styles.saveMessage} role="status">
                  {saveMessage}
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

          <div className={styles.box}>
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