import React, { useEffect, useState } from 'react';
import { NavLink, matchPath, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import Arrow1 from '../../assets/images/Main_arrow1.svg';
import Arrow2 from '../../assets/images/Main_arrow2.svg';

// 현재 URL에 projectId가 없을 때(예: /handovers, /mypage) 쓸 기본 프로젝트
// TODO: 로그인 사용자의 기본/최근 인수인계 정보가 API로 오면 그 값으로 교체
const DEFAULT_PROJECT_ID = '1';

// 경로 → 소속 메뉴 그룹 판별
const getCurrentGroup = (pathname) => {
  if (matchPath('/handovers/:projectId/questions/*', pathname)) return 'qna';
  if (matchPath('/handovers/*', pathname)) return 'handover';
  return null;
};

// /handovers/:projectId/... 에서 projectId 추출 (/handovers/create 는 제외)
const getProjectId = (pathname) => {
  const match = matchPath('/handovers/:projectId/*', pathname);
  const projectId = match?.params.projectId;
  return projectId && projectId !== 'create' ? projectId : null;
};

const subItemClass = (isActive) =>
  isActive ? `${styles.subItem} ${styles.activeSub}` : styles.subItem;

const MenuToggle = ({ label, isOpen, isActive, onToggle, controlsId }) => (
  <button
    type="button"
    className={`${styles.menuHeader} ${isActive ? styles.activeHeader : ''}`}
    aria-expanded={isOpen}
    aria-controls={controlsId}
    onClick={onToggle}
  >
    {label}
    <span className={styles.arrow}>
      <img src={isOpen ? Arrow1 : Arrow2} alt="" />
    </span>
  </button>
);

const Sidebar = () => {
  const { pathname } = useLocation();
  const currentGroup = getCurrentGroup(pathname);
  const urlProjectId = getProjectId(pathname);

  // URL에 projectId가 없는 화면으로 이동해도 마지막으로 보던 프로젝트를 유지
  const [lastProjectId, setLastProjectId] = useState(urlProjectId ?? DEFAULT_PROJECT_ID);
  useEffect(() => {
    if (urlProjectId) setLastProjectId(urlProjectId);
  }, [urlProjectId]);
  const projectId = urlProjectId ?? lastProjectId;

  // 펼침 상태: 현재 경로가 속한 메뉴를 기본으로 열고, 다른 메뉴로 이동하면 그 메뉴를 연다
  const [isHandoverOpen, setIsHandoverOpen] = useState(currentGroup !== 'qna');
  const [isQnAOpen, setIsQnAOpen] = useState(currentGroup === 'qna');
  useEffect(() => {
    if (currentGroup === 'handover') setIsHandoverOpen(true);
    if (currentGroup === 'qna') setIsQnAOpen(true);
  }, [currentGroup]);

  const quizzesPath = `/handovers/${projectId}/quizzes`;
  const questionsPath = `/handovers/${projectId}/questions`;
  const questionCreatePath = `${questionsPath}/create`;
  const isQuestionCreate = Boolean(matchPath(questionCreatePath, pathname));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.menuGroup}>
        <MenuToggle
          label="인수인계"
          isOpen={isHandoverOpen}
          isActive={currentGroup === 'handover'}
          onToggle={() => setIsHandoverOpen((open) => !open)}
          controlsId="sidebar-handover-menu"
        />
        {isHandoverOpen && (
          <div id="sidebar-handover-menu" className={styles.subMenu}>
            <NavLink end to="/handovers" className={({ isActive }) => subItemClass(isActive)}>
              인수인계 목록
            </NavLink>
            <NavLink end to="/handovers/create" className={({ isActive }) => subItemClass(isActive)}>
              인수인계 생성
            </NavLink>
            {/* end 없음: 퀴즈 하위 화면(/quizzes/...)에서도 활성 표시 */}
            <NavLink to={quizzesPath} className={({ isActive }) => subItemClass(isActive)}>
              인수인계 퀴즈
            </NavLink>
          </div>
        )}
      </div>
      <div className={styles.menuGroup}>
        <MenuToggle
          label="Q&A"
          isOpen={isQnAOpen}
          isActive={currentGroup === 'qna'}
          onToggle={() => setIsQnAOpen((open) => !open)}
          controlsId="sidebar-qna-menu"
        />
        {isQnAOpen && (
          <div id="sidebar-qna-menu" className={styles.subMenu}>
            {/* 질문 상세·수정 화면에서도 '질문 목록' 활성, 등록 화면만 '질문 등록' 활성 */}
            <NavLink
              to={questionsPath}
              className={({ isActive }) => subItemClass(isActive && !isQuestionCreate)}
            >
              질문 목록
            </NavLink>
            <NavLink end to={questionCreatePath} className={({ isActive }) => subItemClass(isActive)}>
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
