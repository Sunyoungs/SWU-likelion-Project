import React, { useEffect, useState } from 'react';
import { NavLink, matchPath, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import Arrow1 from '../../assets/images/Main_arrow1.svg';
import Arrow2 from '../../assets/images/Main_arrow2.svg';
import Bar from '../../assets/images/Main_lnbBar.svg';
import BarActive from '../../assets/images/Main_lnbBarActive.svg';

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

const groupClass = (isOpen) =>
  isOpen ? `${styles.menuGroup} ${styles.open}` : styles.menuGroup;

const headerClass = (isActive) =>
  isActive ? `${styles.menuHeader} ${styles.activeHeader}` : styles.menuHeader;

// 메뉴 카드 왼쪽의 세로 막대 + 메뉴 이름 (활성 메뉴는 그라데이션 막대)
const MenuLabel = ({ label, isActive }) => (
  <span className={styles.label}>
    <img src={isActive ? BarActive : Bar} alt="" className={styles.bar} />
    {label}
  </span>
);

const MenuToggle = ({ label, isOpen, isActive, onToggle, controlsId }) => (
  <button
    type="button"
    className={headerClass(isActive || isOpen)}
    aria-expanded={isOpen}
    aria-controls={controlsId}
    onClick={onToggle}
  >
    {/* 그라데이션 막대는 펼침과 상관없이 하위 메뉴 화면에 있을 때만 */}
    <MenuLabel label={label} isActive={isActive} />
    <span className={styles.arrow}>
      <img src={isOpen ? Arrow1 : Arrow2} alt="" />
    </span>
  </button>
);

// 하위 메뉴: 접혀 있어도 렌더링해 두고 높이를 애니메이션한다.
// 접힌 동안에는 inert로 탭 이동·스크린리더 대상에서 뺀다.
const SubMenu = ({ id, isOpen, children }) => (
  <div id={id} className={styles.subMenu} inert={!isOpen}>
    <div className={styles.subMenuClip}>
      <div className={styles.subList}>{children}</div>
    </div>
  </div>
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
  const isHandoverSubPage = Boolean(matchPath('/handovers/:projectId/documents/*', pathname) || matchPath('/handovers/:projectId/status', pathname));

  return (
    <aside className={styles.sidebar}>
      <div className={groupClass(isHandoverOpen)}>
        <MenuToggle
          label="인수인계"
          isOpen={isHandoverOpen}
          isActive={currentGroup === 'handover'}
          onToggle={() => setIsHandoverOpen((open) => !open)}
          controlsId="sidebar-handover-menu"
        />
        <SubMenu id="sidebar-handover-menu" isOpen={isHandoverOpen}>
          <NavLink end to="/handovers" className={({ isActive }) => subItemClass(isActive || isHandoverSubPage)}>
            인수인계 목록
          </NavLink>
          <NavLink end to="/handovers/create" className={({ isActive }) => subItemClass(isActive)}>
            인수인계 생성
          </NavLink>
          <NavLink to={quizzesPath} className={({ isActive }) => subItemClass(isActive)}>
            인수인계 퀴즈
          </NavLink>
        </SubMenu>
      </div>
      <div className={groupClass(isQnAOpen)}>
        <MenuToggle
          label="Q&A"
          isOpen={isQnAOpen}
          isActive={currentGroup === 'qna'}
          onToggle={() => setIsQnAOpen((open) => !open)}
          controlsId="sidebar-qna-menu"
        />
        <SubMenu id="sidebar-qna-menu" isOpen={isQnAOpen}>
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
        </SubMenu>
      </div>
      <div className={styles.menuGroup}>
        <NavLink end to="/notifications" className={({ isActive }) => headerClass(isActive)}>
          {({ isActive }) => (
            <>
              <MenuLabel label="알림 센터" isActive={isActive} />
              {/* TODO: 안 읽은 알림 개수 API 연동 */}
              {!isActive && (
                <span className={styles.badge}>
                  +2 <span className={styles.redDot} />
                </span>
              )}
            </>
          )}
        </NavLink>
      </div>
      <div className={styles.menuGroup}>
        <NavLink end to="/mypage" className={({ isActive }) => headerClass(isActive)}>
          {({ isActive }) => <MenuLabel label="설정" isActive={isActive} />}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
