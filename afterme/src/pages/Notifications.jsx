import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Notifications.module.css';
import bellIcon from '../assets/images/icon-bell.svg';
import emptyIcon from '../assets/images/noti-empty.svg';
import questionIcon from '../assets/images/noti-question.svg';
import deadlineIcon from '../assets/images/noti-deadline.svg';
import quizIcon from '../assets/images/noti-quiz.svg';
import documentIcon from '../assets/images/noti-document.svg';
import inviteIcon from '../assets/images/noti-invite.svg';

const PAGE_SIZE = 6;

// 알림 종류별 표시 정보 (아이콘 · 제목 · 바로가기 버튼 문구)
const TYPE_META = {
  question: { label: '질문', icon: questionIcon, action: 'Q&A 바로가기' },
  answer: { label: '답변 완료', icon: questionIcon, action: 'Q&A 바로가기' },
  interview: { label: 'AI 인터뷰', icon: questionIcon, action: '인터뷰 바로가기' },
  document: { label: '문서 공개', icon: documentIcon, action: '인수인계 바로가기' },
  quiz: { label: '퀴즈', icon: quizIcon, action: '퀴즈 바로가기' },
  deadline: { label: '마감', icon: deadlineIcon, action: '인수인계 현황' },
  invite: { label: '초대', icon: inviteIcon, action: '초대하기' },
};

// 상단 필터 (피그마 tag1) – 전체는 모든 종류
const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'question', label: '질문', types: ['question', 'answer', 'interview'] },
  { key: 'document', label: '문서 공개', types: ['document'] },
  { key: 'quiz', label: '퀴즈', types: ['quiz'] },
  { key: 'deadline', label: '마감 일정', types: ['deadline'] },
  { key: 'invite', label: '초대', types: ['invite'] },
];

// TODO: 서버 연동 시 삭제하고 실제 알림 목록 API로 교체 (테스트용 임시 데이터)
const now = Date.now();
const minutesAgo = (m) => new Date(now - m * 60 * 1000).toISOString();
const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'question', message: '후임자가 새로운 질문을 남겼어요.', createdAt: minutesAgo(0), isRead: false, link: '/qna' },
  { id: 2, type: 'deadline', message: '인수인계 마감이 3일 남았어요.', createdAt: minutesAgo(0), isRead: false, link: '/handovers' },
  { id: 3, type: 'quiz', message: '후임자가 퀴즈를 응시했어요.', createdAt: minutesAgo(0), isRead: false, link: '/quiz' },
  { id: 4, type: 'question', message: '후임자가 새로운 질문을 남겼어요.', createdAt: minutesAgo(0), isRead: false, link: '/qna' },
  { id: 5, type: 'document', message: '인수인계를 공개했어요', createdAt: minutesAgo(60 * 24 * 6), isRead: true, link: '/handovers' },
  { id: 6, type: 'invite', message: '김도윤님을 초대했어요', createdAt: minutesAgo(60 * 24 * 7), isRead: true, link: null },
];

/**
 * 중복 알림 방지: 같은 id 의 알림은 하나만 남김 (나중에 받은 정보로 갱신)
 * - 새로고침·실시간 수신(폴링/웹소켓)으로 목록을 합칠 때 사용
 * - 서버에서도 같은 이벤트로 알림이 두 번 만들어지지 않도록 막아야 함
 */
export function mergeNotifications(prev, incoming) {
  const map = new Map(prev.map((n) => [n.id, n]));
  incoming.forEach((n) => map.set(n.id, { ...map.get(n.id), ...n }));
  return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  if (days < 14) return '일주일 전';
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function NotificationItem({ item, onOpen }) {
  const meta = TYPE_META[item.type] ?? TYPE_META.question;
  const hasLink = Boolean(item.link);

  return (
    <li>
      <button
        type="button"
        className={`${styles.card} ${hasLink ? '' : styles.cardNoLink}`}
        onClick={() => onOpen(item)}
        aria-label={`${meta.label} 알림, ${item.isRead ? '읽음' : '읽지 않음'}, ${item.message}`}
      >
        <div className={styles.cardMain}>
          <img className={styles.typeIcon} src={meta.icon} alt="" width="50" height="50" />
          <div className={styles.cardText}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>
                {!item.isRead && <span className={styles.dot} aria-hidden="true" />}
                {meta.label}
              </span>
              <span className={styles.cardMeta}>
                <span className={item.isRead ? styles.badgeRead : styles.badgeUnread}>
                  {item.isRead ? '읽음' : '미읽음'}
                </span>
                <time className={styles.time} dateTime={item.createdAt}>
                  {formatRelativeTime(item.createdAt)}
                </time>
              </span>
            </div>
            <p className={styles.message}>{item.message}</p>
          </div>
        </div>

        {/* 바로가기 버튼 모양 (카드 전체가 하나의 버튼) */}
        <span className={styles.action} aria-hidden="true">
          {meta.action}
        </span>
      </button>
    </li>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() =>
    mergeNotifications([], MOCK_NOTIFICATIONS),
  );
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = useMemo(() => {
    const target = FILTERS.find((f) => f.key === filter);
    if (!target?.types) return notifications;
    return notifications.filter((n) => target.types.includes(n.type));
  }, [notifications, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const markAsRead = (ids) => {
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
    // TODO: 여기에 읽음 처리 API 호출 (ids)
  };

  // 알림 클릭 → 읽음 처리 후 해당 화면으로 이동
  const handleOpen = (item) => {
    if (!item.isRead) markAsRead([item.id]);
    if (item.link) navigate(item.link);
  };

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    markAsRead(notifications.filter((n) => !n.isRead).map((n) => n.id));
  };

  const handleFilter = (key) => {
    setFilter(key);
    setPage(1);
  };

  const activeFilterLabel = FILTERS.find((f) => f.key === filter)?.label;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <img src={bellIcon} alt="" width="30" height="30" />
          알림 센터
        </h1>

        <div className={styles.summary}>
          <p className={styles.unread} aria-live="polite">
            읽지 않은 알림 {unreadCount}개
          </p>
          {/* 기능 명세: 읽지 않은 알림이 없으면 비활성화 */}
          <button
            type="button"
            className={styles.markAllButton}
            onClick={handleMarkAll}
            disabled={unreadCount === 0}
          >
            모두 읽음 처리
          </button>
        </div>
      </div>

      <div className={styles.filters} role="group" aria-label="알림 종류">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.filter} ${filter === f.key ? styles.filterActive : ''}`}
            onClick={() => handleFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <img src={emptyIcon} alt="" width="64" height="64" />
          </div>
          <p className={styles.emptyText}>
            {filter === 'all' ? '아직 알림이 없어요.' : `${activeFilterLabel} 알림이 없어요.`}
          </p>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {pageItems.map((item) => (
              <NotificationItem key={item.id} item={item} onOpen={handleOpen} />
            ))}
          </ul>

          <nav className={styles.pagination} aria-label="페이지">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.pageButton} ${n === currentPage ? styles.pageButtonActive : ''}`}
                onClick={() => setPage(n)}
                aria-current={n === currentPage ? 'page' : undefined}
              >
                {n}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}