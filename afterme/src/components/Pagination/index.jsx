import React from 'react';
import styles from './Pagination.module.css';

const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages < 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className={styles.pagination} aria-label="페이지 이동">
      {totalPages > 1 && (
        <button
          type="button"
          className={styles.arrow}
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="이전 페이지"
        >
          ‹
        </button>
      )}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`${styles.page} ${p === page ? styles.active : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      {totalPages > 1 && (
        <button
          type="button"
          className={styles.arrow}
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="다음 페이지"
        >
          ›
        </button>
      )}
    </nav>
  );
};

export default Pagination;
