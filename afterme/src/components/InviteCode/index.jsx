import React, { useEffect, useId, useState } from 'react';
import Button from '../Button';
import { verifyInvitationCode, joinInvitation } from '../../api/handoverApi';
import { ROLE_LABEL } from '../../utils/handoverFormat';
import styles from './InviteCode.module.css';

const InviteCodeForm = ({ variant = 'inline', onClose, onJoined }) => {
  const inputId = useId();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [invitation, setInvitation] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const trimmed = code.trim();
    setJoinError('');
    if (!trimmed) {
      setStatus('idle');
      setInvitation(null);
      return undefined;
    }

    setStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const info = await verifyInvitationCode(trimmed);
        if (cancelled) return;
        setInvitation(info);
        setStatus('valid');
      } catch {
        if (cancelled) return;
        setInvitation(null);
        setStatus('invalid');
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== 'valid' || joining) return;

    setJoining(true);
    setJoinError('');
    try {
      const result = await joinInvitation(code.trim());
      onJoined?.(result);
    } catch (err) {
      setJoinError(err?.response?.data?.message || '참여하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setJoining(false);
    }
  };

  const isModal = variant === 'modal';

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <p className={styles.heading}>초대 코드를 입력해 주세요.</p>

      <label className={styles.label} htmlFor={inputId}>
        초대 코드
      </label>
      <input
        id={inputId}
        className={`${styles.input} ${status === 'invalid' ? styles.inputError : ''}`}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="예) LNK-26-7QX4"
        autoComplete="off"
        autoFocus
        aria-invalid={status === 'invalid'}
        aria-describedby={status === 'invalid' ? `${inputId}-error` : undefined}
      />
      {status === 'invalid' && (
        <p id={`${inputId}-error`} className={styles.error} role="alert">
          해당 초대코드는 존재하지 않습니다.
        </p>
      )}

      <div className={styles.orgBox} aria-live="polite">
        <p className={styles.orgLabel}>초대받은 조직</p>
        {status === 'checking' && <p className={styles.orgMuted}>확인 중...</p>}
        {status === 'valid' && invitation && (
          <>
            <p className={styles.orgText}>{invitation.organizationName}</p>
            <p className={styles.orgText}>
              역할 : {ROLE_LABEL[invitation.role] ?? invitation.role}
              {invitation.teamName && ` (${invitation.teamName})`}
            </p>
          </>
        )}
      </div>

      {joinError && (
        <p className={styles.error} role="alert">
          {joinError}
        </p>
      )}

      <div className={styles.actions}>
        {isModal && (
          <Button text="닫기" variant="white" onClick={onClose} className={styles.closeBtn} />
        )}
        <Button
          type="submit"
          text={joining ? '참여 중...' : '참여하고 시작하기'}
          variant={isModal ? 'primary' : 'white'}
          disabled={status !== 'valid' || joining}
          className={styles.submitBtn}
        />
      </div>
    </form>
  );
};

export default InviteCodeForm;
