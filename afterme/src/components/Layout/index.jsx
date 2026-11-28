import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

import Header from '../Header';
import Sidebar from '../Sidebar';
import LoginRequiredModal from '../LoginRequiredModal';
import { onUnauthorized } from '../../api/authEvents';

const Layout = () => {
  const { pathname } = useLocation();
  // 어느 화면이든 서버가 '다시 로그인해야 한다'는 401을 주면 원래 화면 위에 로그인 안내 모달을 띄운다.
  // 다른 화면으로 이동하면 닫는다 (그 화면도 401이면 곧바로 다시 뜬다).
  const [unauthorized, setUnauthorized] = useState(false);
  const close = useCallback(() => setUnauthorized(false), []);

  useEffect(() => onUnauthorized(() => setUnauthorized(true)), []);
  useEffect(close, [pathname, close]);

  return (
    <div className={styles.layoutContainer}>
      <Header />
      <div className={styles.mainWrapper}>
        <Sidebar />
        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
      {unauthorized && <LoginRequiredModal onClose={close} />}
    </div>
  );
};

export default Layout;
