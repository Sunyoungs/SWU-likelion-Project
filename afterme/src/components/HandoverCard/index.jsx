import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../Button';
import Checkbox from '../Checkbox';
import RoleBadge from '../RoleBadge';
import StatusBadge from '../StatusBadge';
import cardMenu from '../../assets/images/card_menu.svg';
import cardCheck from '../../assets/images/card_check.svg';
import { ROLE, HANDOVER_STATUS, QUIZ_STATUS, formatPeriod, getDdayBadge, isCompletenessMet } from '../../utils/handoverFormat';
import styles from './HandoverCard.module.css';

const HandoverCard = ({ item, selected, onSelect, onComplete }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const base = `/handovers/${item.projectId}`;
  const isPredecessor = item.myRole === ROLE.PREDECESSOR;
  const isCompleted = item.status === HANDOVER_STATUS.COMPLETED;
  const met = isCompletenessMet(item);
  const quiz = QUIZ_STATUS[item.quizStatus] ?? QUIZ_STATUS.NOT_TAKEN;
  const dday = getDdayBadge(item.deadline, item.status);
  const canComplete = !isCompleted && met && item.quizStatus === 'PASSED';
  const score = Math.max(0, Math.min(100, item.completenessScore));
  const cutline = Math.max(0, Math.min(100, item.minCompletenessScore));

  const menuItems = isPredecessor
    ? [
        { label: '인수인계서 보기', to: `${base}/documents` },
        { label: '업무 등록', to: `${base}/tasks/create` },
        { label: 'Q&A 답변하기', to: `${base}/questions` },
      ]
    : [
        { label: '인수인계서 열람', to: `${base}/documents` },
        { label: '질문하기', to: `${base}/questions/create` },
        { label: '퀴즈 보기', to: `${base}/quizzes` },
      ];

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const personRow = (label, person, isMe) => (
    <div className={`${styles.personRow} ${isMe ? styles.me : ''}`}>
      <dt>{label}</dt>
      <dd>
        {person.name}
        {person.assignedRole && ` (${person.assignedRole})`}
      </dd>
    </div>
  );

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div className={styles.topLeft}>
          <Checkbox checked={selected} onChange={(checked) => onSelect(item.projectId, checked)} label={`${item.title} 선택`} />
          <RoleBadge role={item.myRole} size="sm" />
        </div>
        <div className={styles.topRight} ref={menuRef}>
          <StatusBadge {...dday} />
          <button type="button" className={styles.kebab} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <img src={cardMenu} alt="" width={18} height={18} />
          </button>
          {menuOpen && (
            <ul className={styles.menu} role="menu">
              {menuItems.map((menu) => (
                <li key={menu.label} role="none">
                  <button type="button" role="menuitem" className={styles.menuItem} onClick={() => navigate(menu.to)}>
                    {menu.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className={styles.id}>ID : {item.projectId}</p>
      <h3 className={styles.title} title={item.title}>
        {item.title}
      </h3>
      <p className={styles.period}>{formatPeriod(item.startDate, item.deadline)}</p>

      <dl className={styles.people}>
        {personRow('전임자', item.predecessor, isPredecessor)}
        {personRow('후임자', item.successor, !isPredecessor)}
      </dl>

      <div className={styles.scoreHead}>
        <span>완성도 점수</span>
        <span className={`${styles.scoreValue} ${met ? styles.met : styles.unmet}`}>
          {item.completenessScore}점 · {met ? '충족' : '불충족'}
        </span>
      </div>
      <div className={styles.bar} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`완성도 ${score}점, 최소 기준 ${cutline}점`}>
        <div className={`${styles.fill} ${met ? styles.fillMet : styles.fillUnmet}`} style={{ width: `${score}%` }} />
        <span className={styles.marker} style={{ left: `${cutline}%` }} />
      </div>
      <p className={styles.quizRow}>
        <strong className={styles[quiz.tone]}>{quiz.label}</strong> · 통과 기준 {item.quizCutline}점
      </p>

      <div className={styles.actions}>
        {isPredecessor ? (
          <>
            <Button text="현황 보기" variant="white" className={styles.actionBtn} onClick={() => navigate(`${base}/quizzes`)} />
            {isCompleted ? (
              <Button text="인수인계 완료" variant="green" icon={<img src={cardCheck} alt="" width={16} height={16} />} className={`${styles.actionBtn} ${styles.staticBtn}`} tabIndex={-1} />
            ) : (
              <Button text="완료 하기" variant={canComplete ? 'primary' : 'deactivate'} disabled={!canComplete} title={canComplete ? undefined : '최소 완성도와 퀴즈 기준을 충족하면 완료할 수 있어요.'} className={styles.actionBtn} onClick={() => onComplete(item)} />
            )}
          </>
        ) : (
          <>
            <Button text="인수인계서 열람" variant="white" className={styles.actionBtn} onClick={() => navigate(`${base}/documents`)} />
            {isCompleted ? (
              <Button text="인수인계 완료" variant="green" icon={<img src={cardCheck} alt="" width={16} height={16} />} className={`${styles.actionBtn} ${styles.staticBtn}`} tabIndex={-1} />
            ) : (
              <Button text="퀴즈 풀기" variant="purple"  className={styles.actionBtn} onClick={() => navigate(`${base}/quizzes`)} />
            )}
          </>
        )}
      </div>
    </article>
  );
};

export default HandoverCard;
