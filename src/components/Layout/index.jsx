import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

import Header from '../Header'; 
import Sidebar from '../Sidebar';

const Layout = () => {
  return (
    <div className={styles.layoutContainer}>
      <Header />
      <div className={styles.mainWrapper}>
        <Sidebar />
        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;