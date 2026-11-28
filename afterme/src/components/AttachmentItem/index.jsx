import React from 'react';
import styles from './AttachmentItem.module.css';
import FileIcon from '../../assets/images/QnA_fileImage.svg';
import RemoveIcon from '../../assets/images/QnA_fileRemove.svg';

// 348000 → '340KB', 2_500_000 → '2.4MB'
export const formatFileSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;

// 첨부 파일 칩
// - href가 있으면 누를 때 새 탭에서 열린다 (이미지·PDF 등은 브라우저가 열고, 나머지는 내려받기)
// - onOpen이 있으면 누를 때 onOpen을 부른다 (토큰이 필요한 서버 파일은 직접 받아서 연다)
// - onRemove가 있으면 오른쪽에 삭제(✕) 버튼을 보여준다 (등록·수정 화면)
const AttachmentItem = ({ name, size, href, onOpen, onRemove, className = '' }) => {
  const info = (
    <>
      <span className={styles.icon}>
        <img src={FileIcon} alt="" />
      </span>
      <span className={styles.name}>{name}</span>
      {size != null && <span className={styles.size}>{formatFileSize(size)}</span>}
    </>
  );

  return (
    <div className={`${styles.item} ${className}`}>
      {onOpen ? (
        <button type="button" className={`${styles.info} ${styles.link} ${styles.openButton}`} onClick={onOpen}>
          {info}
        </button>
      ) : href ? (
        <a className={`${styles.info} ${styles.link}`} href={href} target="_blank" rel="noopener noreferrer">
          {info}
        </a>
      ) : (
        <span className={styles.info}>{info}</span>
      )}
      {onRemove && (
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={`${name} 삭제`}>
          <img src={RemoveIcon} alt="" />
        </button>
      )}
    </div>
  );
};

export default AttachmentItem;
