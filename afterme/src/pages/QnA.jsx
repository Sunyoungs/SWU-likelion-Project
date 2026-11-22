import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Tag from '../components/Tag';
import styles from './QnA.module.css';
import SortArrow from '../assets/images/QnA_sortArrow.svg';
import EmptyPlane from '../assets/images/QnA_emptyPlane.svg';
import { getQuestionList, SORT_OPTIONS, STATUS_LABEL } from '../api/questions';
import { useApi } from '../hooks/useApi';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// 서버가 준 등록 일시 → '방금' / 'N분 전' / 'N시간 전' / 'N일 전'
const formatRelativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE_MS) return '방금';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}분 전`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}시간 전`;
  return `${Math.floor(diff / DAY_MS)}일 전`;
};

// 'all'은 '내가 답변해야 할 질문' 전체
const FILTERS = [
  { value: 'all', label: '내가 답변해야 할 질문' },
  { value: 'unresolved', label: STATUS_LABEL.unresolved },
  { value: 'resolved', label: STATUS_LABEL.resolved },
];

function QnA() {
  const { projectId } = useParams();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('latest');
  const { data: questions, error } = useApi(
    () => getQuestionList(projectId, { sort }),
    [projectId, sort],
  );

  const list = questions ?? [];
  const counts = {
    unresolved: list.filter((q) => q.status === 'unresolved').length,
    resolved: list.filter((q) => q.status === 'resolved').length,
  };
  const visible = filter === 'all' ? list : list.filter((q) => q.status === filter);

  // 질문이 하나라도 있을 때만 필터 옆에 개수를 붙인다 (빈 화면 디자인은 개수 없이 표시)
  const filterLabel = ({ value, label }) =>
    value === 'all' || list.length === 0 ? label : `${label} ${counts[value]}`;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Q&amp;A</h1>

      <p className={styles.unanswered}>답하지 않은 질문 {counts.unresolved}개</p>

      <div className={styles.listArea}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            {FILTERS.map((f) => (
              <Tag
                key={f.value}
                text={filterLabel(f)}
                variant={filter === f.value ? 'active' : 'inactive'}
                onClick={() => setFilter(f.value)}
              />
            ))}
          </div>

          <label className={styles.sort}>
            <select
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="정렬"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <img src={SortArrow} alt="" className={styles.sortArrow} />
          </label>
        </div>

        <div role="table" aria-label="질문 목록">
          <div role="row" className={`${styles.row} ${styles.headRow}`}>
            <span role="columnheader" className={styles.statusHead}>상태</span>
            <span role="columnheader">질문</span>
            <span role="columnheader">관련 항목</span>
            <span role="columnheader">작성자</span>
            <span role="columnheader" className={styles.dateCell}>등록</span>
          </div>

          {/* TODO: 질문 상세 화면이 생기면 행 클릭 시 /handovers/:projectId/questions/:threadId 로 이동 */}
          {visible.map((q) => (
            <div role="row" key={q.threadId} className={`${styles.row} ${styles.bodyRow}`}>
              <span role="cell">
                <span className={`${styles.status} ${styles[q.status] ?? ''}`}>{STATUS_LABEL[q.status]}</span>
              </span>
              <span role="cell" className={styles.question}>
                <span className={styles.questionTitle}>{q.title}</span>
                <span className={styles.questionContent}>{q.content}</span>
              </span>
              <span role="cell" className={styles.topic}>{q.topicId}. {q.topicName}</span>
              <span role="cell" className={styles.author}>{q.authorName}</span>
              <span role="cell" className={`${styles.author} ${styles.dateCell}`}>{formatRelativeTime(q.createdAt)}</span>
            </div>
          ))}
        </div>

        {error && <p className={styles.emptyDesc}>질문 목록을 불러오지 못했어요.</p>}

        {questions && visible.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <img src={EmptyPlane} alt="" />
            </div>
            <p className={styles.emptyTitle}>아직 후임자의 질문이 없어요.</p>
            <p className={styles.emptyDesc}>후임자는 자유롭게 전임자에게 질문을 남겨 주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QnA;
