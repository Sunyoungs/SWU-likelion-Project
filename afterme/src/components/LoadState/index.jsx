import React, { useEffect, useState } from 'react';
import Button from '../Button';
import styles from './LoadState.module.css';
import { errorKind } from '../../utils/apiError';

const RETRY_SECONDS = 30;

// '해설을' / '퀴즈를'처럼 마지막 글자 받침에 맞춰 을·를을 붙인다
function withObject(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasFinal ? '을' : '를'}`;
}

// 서버에서 데이터를 받는 동안의 로딩 화면과, 실패했을 때의 안내 화면.
// what: '퀴즈 정보'처럼 불러오는 대상 이름. onRetry: useApi의 reload.
function LoadState({ loading, error, what, onRetry }) {
  if (loading) {
    return (
      <div className={styles.wrap} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <p className={styles.title}>{withObject(what)} 불러오는 중이에요</p>
        <p className={styles.desc}>잠시만 기다려 주세요.</p>
      </div>
    );
  }
  if (error) return <ErrorState error={error} what={what} onRetry={onRetry} />;
  return null;
}

function ErrorState({ error, what, onRetry }) {
  const kind = errorKind(error);
  const [left, setLeft] = useState(RETRY_SECONDS);

  // 서버 연결 실패일 때만 30초 뒤 자동으로 다시 시도한다
  useEffect(() => {
    if (kind !== 'server' || !onRetry) return undefined;
    if (left <= 0) {
      onRetry();
      return undefined;
    }
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [kind, left, onRetry]);

  return (
    <div className={styles.wrap} role="alert">
      <p className={styles.title}>{withObject(what)} 불러오지 못했어요</p>
      {kind === 'auth' ? (
        // 로그인 안내 모달은 Layout이 띄운다. 모달을 닫았을 때 이 문구가 보인다.
        <p className={styles.desc}>로그인이 필요해요. 다시 로그인한 뒤 확인해 주세요.</p>
      ) : kind === 'server' ? (
        <p className={styles.desc}>
          서버에 연결하지 못했어요. <strong className={styles.count}>{left}초</strong> 뒤에 자동으로 다시 시도할게요.
        </p>
      ) : (
        <p className={styles.desc}>잠시 후 다시 시도해 주세요.</p>
      )}
      {onRetry && kind !== 'auth' && <Button text="지금 다시 시도" variant="white" className={styles.button} onClick={onRetry} />}
    </div>
  );
}

export default LoadState;
