import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import Arrow1 from '../../assets/images/Main_arrow1.svg';
import Arrow2 from '../../assets/images/Main_arrow2.svg';

const Sidebar = () => {
  const [isHandoverOpen, setIsHandoverOpen] = useState(true); 
  const [isQnAOpen, setIsQnAOpen] = useState(false);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.menuGroup}>
        <div 
          className={`${styles.menuHeader} ${isHandoverOpen ? styles.activeHeader : ''}`}
          onClick={() => setIsHandoverOpen(!isHandoverOpen)}
        >
          인수인계
          <span className={styles.arrow}>
            <img src={isHandoverOpen ? Arrow1 : Arrow2} alt="arrow" />
          </span>
        </div>
        {isHandoverOpen && (
          <div className={styles.subMenu}>
            <NavLink end to="/" className={({ isActive }) => isActive ? `${styles.subItem} ${styles.activeSub}` : styles.subItem}>
              인수인계 목록
            </NavLink>
            <NavLink end to="/handovers/create" className={({ isActive }) => isActive ? `${styles.subItem} ${styles.activeSub}` : styles.subItem}>
              인수인계 생성
            </NavLink>
            <NavLink end to="/handovers/1/quizzes" className={({ isActive }) => isActive ? `${styles.subItem} ${styles.activeSub}` : styles.subItem}>
              인수인계 퀴즈
            </NavLink>
          </div>
        )}
      </div>
      <div className={styles.menuGroup}>
        <div 
          className={`${styles.menuHeader} ${isQnAOpen ? styles.activeHeader : ''}`}
          onClick={() => setIsQnAOpen(!isQnAOpen)}
        >
          Q&A
          <span className={styles.arrow}>
            <img src={isQnAOpen ? Arrow1 : Arrow2} alt="arrow" />
          </span>
        </div>
        {isQnAOpen && (
          <div className={styles.subMenu}>
            <NavLink end to="/handovers/1/questions" className={({ isActive }) => isActive ? `${styles.subItem} ${styles.activeSub}` : styles.subItem}>
              질문 목록
            </NavLink>
            <NavLink end to="/handovers/1/questions/create" className={({ isActive }) => isActive ? `${styles.subItem} ${styles.activeSub}` : styles.subItem}>
              질문 등록
            </NavLink>
          </div>
        )}
      </div>
      <div className={styles.menuGroup}>
        <NavLink end to="/notifications" className={({ isActive }) => isActive ? `${styles.menuHeader} ${styles.activeHeader}` : styles.menuHeader}>
          알림 센터
          <span className={styles.badge}>+2 <span className={styles.redDot}></span></span>
        </NavLink>
      </div>
      <div className={styles.menuGroup}>
        <NavLink end to="/mypage" className={({ isActive }) => isActive ? `${styles.menuHeader} ${styles.activeHeader}` : styles.menuHeader}>
          설정
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;