import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Tag from '../components/Tag';
import HandoverCard from '../components/HandoverCard';
import HandoverTable from '../components/HandoverTable';
import InviteCode from '../components/InviteCode';
import Pagination from '../components/Pagination';
import arrowDown from '../assets/images/card_arrowDown.svg';
import Empty from '../assets/images/list_empty.svg';
import { fetchHandovers, completeHandover } from '../api/handoverApi';
import { ROLE, HANDOVER_STATUS } from '../utils/handoverFormat';
import styles from './HandoverList.module.css';

const FILTERS = [
  { key: 'ALL', label: '전체' },
  { key: ROLE.PREDECESSOR, label: '전임자' },
  { key: ROLE.SUCCESSOR, label: '후임자' },
  { key: HANDOVER_STATUS.IN_PROGRESS, label: '진행 중' },
  { key: HANDOVER_STATUS.COMPLETED, label: '완료' },
];
const CARD_VIEW_FILTERS = [ROLE.PREDECESSOR, ROLE.SUCCESSOR];

const SORTS = [
  { key: 'latest', label: '최신순' },
  { key: 'deadline', label: '마감 임박순' },
  { key: 'name', label: '이름순' },
];

const sorters = {
  latest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
  name: (a, b) => a.title.localeCompare(b.title, 'ko'),
};

const matchFilter = (item, filter) =>
  filter === 'ALL' || item.myRole === filter || item.status === filter;

const PAGE_SIZE = 8;

const EmptyState = ({ onInvite, onCreate }) => (
  <div className={styles.empty}>
    <div className={styles.emptyIcon}>
      <img src={Empty} alt="" width={48} height={48} />
    </div>
    <p className={styles.emptyTitle}>참여 중인 인수인계가 없어요.</p>
    <p className={styles.emptyDesc}>
      전임자라면 새 인수인계를 만들고, 후임자라면 받은 초대 코드로 참여해 보세요.
    </p>
    <div className={styles.emptyActions}>
      <Button text="초대 코드 입력" variant="white" className={styles.emptyBtn} onClick={onInvite} />
      <Button text="인수인계 생성" variant="primary" className={styles.emptyBtn} onClick={onCreate} />
    </div>
  </div>
);

function HandoverList() {
  const navigate = useNavigate();

  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [inviteMode, setInviteMode] = useState(null); 

  const loadHandovers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setHandovers(await fetchHandovers());
    } catch {
      setLoadError('인수인계 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHandovers();
  }, [loadHandovers]);

  useEffect(() => {
    if (inviteMode !== 'modal') return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') setInviteMode(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [inviteMode]);

  const counts = useMemo(
    () => ({
      total: handovers.length,
      predecessor: handovers.filter((h) => h.myRole === ROLE.PREDECESSOR).length,
      successor: handovers.filter((h) => h.myRole === ROLE.SUCCESSOR).length,
    }),
    [handovers]
  );

  const visible = useMemo(
    () => handovers.filter((h) => matchFilter(h, filter)).sort(sorters[sort]),
    [handovers, filter, sort]
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const isEmpty = !loading && !loadError && handovers.length === 0;
  const isCardView = CARD_VIEW_FILTERS.includes(filter);

  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(1);
  };

  const handleSelect = (projectId, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(projectId);
      else next.delete(projectId);
      return next;
    });
  };

  const handleJoined = async () => {
    setInviteMode(null);
    await loadHandovers();
  };

  const handleComplete = async (item) => {
    if (!window.confirm(`'${item.title}' 인수인계를 완료 처리할까요?`)) return;
    try {
      await completeHandover(item.projectId);
      await loadHandovers();
    } catch (err) {
      if (err?.response?.data?.code === 'CONFLICT') alert(err.response.data.message);
    }
  };

  const handleBulkApproval = () => alert('일괄 승인 요청 기능은 준비 중이에요.');
  const handleBulkPdf = () => alert('PDF 일괄 내보내기 기능은 준비 중이에요.');

  let body;
  if (loading) {
    body = <p className={styles.message}>불러오는 중...</p>;
  } else if (loadError) {
    body = (
      <div className={styles.message}>
        <p>{loadError}</p>
        <Button text="다시 시도" variant="white" onClick={loadHandovers} />
      </div>
    );
  } else if (isEmpty) {
    body =
      inviteMode === 'inline' ? (
        <div className={styles.inlineInvite}>
          <InviteCode variant="inline" onJoined={handleJoined} />
        </div>
      ) : (
        <EmptyState
          onInvite={() => setInviteMode('inline')}
          onCreate={() => navigate('/handovers/create')}
        />
      );
  } else if (visible.length === 0) {
    body = <p className={styles.message}>조건에 맞는 인수인계가 없어요.</p>;
  } else if (isCardView) {
    body = (
      <div className={styles.cardGrid}>
        {pageItems.map((item) => (
          <HandoverCard
            key={item.projectId}
            item={item}
            selected={selectedIds.has(item.projectId)}
            onSelect={handleSelect}
            onComplete={handleComplete}
          />
        ))}
      </div>
    );
  } else {
    body = <HandoverTable items={pageItems} selectedIds={selectedIds} onSelect={handleSelect} />;
  }

  const showListChrome = !loading && !loadError && !isEmpty;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>인수인계 목록</h1>
        <p className={styles.summary}>
          참여 중인 인수인계 <strong>{counts.total}건</strong> · 내 역할: 전임자 {counts.predecessor} /
          후임자 {counts.successor}
        </p>

        <div className={styles.toolbar}>
          <div className={styles.filters} role="group" aria-label="인수인계 필터">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={styles.filterBtn}
                aria-pressed={filter === key}
                onClick={() => handleFilterChange(key)}
              >
                <Tag
                  text={label}
                  variant={filter === key ? 'active' : 'inactive'}
                  className={styles.filterTag}
                />
              </button>
            ))}
          </div>

          <div className={styles.sortWrap}>
            <select
              className={styles.sort}
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              aria-label="정렬"
            >
              {SORTS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <span className={styles.sortIcon}>
              <img src={arrowDown} alt="" width={16} height={16} />
            </span>
          </div>
        </div>

        {showListChrome && (
          <div className={styles.selectionBar}>
            <span>
              선택한 항목 <strong>{selectedIds.size}</strong>개
            </span>
            <Button
              text="일괄 승인 요청"
              variant="white"
              className={styles.smallBtn}
              disabled={selectedIds.size === 0}
              onClick={handleBulkApproval}
            />
            <Button
              text="PDF 일괄 내보내기"
              variant="white"
              className={styles.smallBtn}
              disabled={selectedIds.size === 0}
              onClick={handleBulkPdf}
            />
          </div>
        )}

        <div className={styles.listArea}>{body}</div>

        {showListChrome && (
          <div className={styles.footer}>
            <span />
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            <div className={styles.footerRight}>
              <Button
                text="초대 코드 입력"
                variant="white"
                className={styles.smallBtn}
                onClick={() => setInviteMode('modal')}
              />
            </div>
          </div>
        )}
      </div>

      {inviteMode === 'modal' && (
        <div
          className={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setInviteMode(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="초대 코드 입력">
            <InviteCode
              variant="modal"
              onClose={() => setInviteMode(null)}
              onJoined={handleJoined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default HandoverList;
