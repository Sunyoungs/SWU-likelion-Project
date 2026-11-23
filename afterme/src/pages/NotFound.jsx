import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

// 정의되지 않은 모든 경로(<Route path="*">)에서 보여주는 404 안내 화면
function NotFound() {
  return (
    <main className={styles.wrapper}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>페이지를 찾을 수 없어요</h1>
      <p className={styles.description}>
        주소가 잘못 입력되었거나, 페이지가 이동 또는 삭제되었을 수 있어요.
      </p>
      <Link to="/handovers" className={styles.homeLink}>
        인수인계 목록으로 가기
      </Link>
    </main>
  );
}

export default NotFound;
