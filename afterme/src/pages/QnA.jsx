import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Tag from '../components/Tag';
import QnAStatus from '../components/QnAStatus';
import styles from './QnA.module.css';
import SortArrow from '../assets/images/QnA_sortArrow.svg';
import EmptyPlane from '../assets/images/QnA_emptyPlane.svg';
import { getMyRole, getQuestionList, SORT_OPTIONS, STATUS_LABEL, formatRelativeTime, topicLabel } from '../api/questions';
import LoadState from '../components/LoadState';
import { useApi } from '../hooks/useApi';

// 역할별 문구. 전임자는 답변할 질문을, 후임자는 내가 올린 질문을 본다.
// (후임자 목록은 디자인이 없어서 전임자 목록과 같은 형태로 문구만 바꿨다)
const ROLE_TEXT = {
  predecessor: {
    allFilter: '내가 답변해야 할 질문',
    pending: (n) => `답하지 않은 질문 ${n}개`,
    emptyTitle: '아직 후임자의 질문이 없어요.',
    emptyDesc: '후임자는 자유롭게 전임자에게 질문을 남겨 주세요.',
  },
  successor: {
    allFilter: '내가 한 질문',
    pending: (n) => `답변을 기다리는 질문 ${n}개`,
    emptyTitle: '아직 등록한 질문이 없어요.',
    emptyDesc: '궁금한 점이 있다면 전임자에게 질문을 남겨 주세요.',
  },
};

function QnA() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('latest');
  const me$ = useApi(() => getMyRole(projectId), [projectId]);
  const me = me$.data;
  const { data: questions, loading, error, reload } = useApi(
    () => getQuestionList(projectId, { sort }),
    [projectId, sort],
  );

  const text = ROLE_TEXT[me?.role] ?? ROLE_TEXT.predecessor;
  const filters = [
    { value: 'all', label: text.allFilter },
    { value: 'unresolved', label: STATUS_LABEL.unresolved },
    { value: 'resolved', label: STATUS_LABEL.resolved },
  ];

  const list = questions ?? [];
  const counts = {
    unresolved: list.filter((q) => q.status === 'unresolved').length,
    resolved: list.filter((q) => q.status === 'resolved').length,
  };
  const visible = filter === 'all' ? list : list.filter((q) => q.status === filter);

  // 질문이 하나라도 있을 때만 필터 옆에 개수를 붙인다 (빈 화면 디자인은 개수 없이 표시)
  const filterLabel = ({ value, label }) =>
    value === 'all' || list.length === 0 ? label : `${label} ${counts[value]}`;

  if (!me) return <LoadState loading={me$.loading} error={me$.error} what="질문 목록" onRetry={me$.reload} />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Q&amp;A</h1>

      <p className={styles.unanswered}>{text.pending(counts.unresolved)}</p>

      <div className={styles.listArea}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            {filters.map((f) => (
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

          {visible.map((q) => (
            <div
              role="row"
              key={q.threadId}
              className={`${styles.row} ${styles.bodyRow}`}
              onClick={() => navigate(`/handovers/${projectId}/questions/${q.threadId}`)}
            >
              <span role="cell">
                <QnAStatus variant={q.status} />
              </span>
              <span role="cell" className={styles.question}>
                <span className={styles.questionTitle}>{q.title}</span>
                <span className={styles.questionContent}>{q.content}</span>
              </span>
              <span role="cell" className={styles.topic}>{topicLabel(q)}</span>
              <span role="cell" className={styles.author}>{q.authorName}</span>
              <span role="cell" className={`${styles.author} ${styles.dateCell}`}>{formatRelativeTime(q.createdAt)}</span>
            </div>
          ))}
        </div>

        {(loading || error) && <LoadState loading={loading} error={error} what="질문 목록" onRetry={reload} />}

        {questions && visible.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <img src={EmptyPlane} alt="" />
            </div>
            <p className={styles.emptyTitle}>{text.emptyTitle}</p>
            <p className={styles.emptyDesc}>{text.emptyDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QnA;
