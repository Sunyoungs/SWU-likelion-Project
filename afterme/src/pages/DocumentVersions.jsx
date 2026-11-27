import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import {
  fetchHandoverDetail,
  fetchDocumentView,
  fetchVersionHistory,
  fetchVersionDetail,
} from '../api/handoverApi';
import styles from './DocumentVersions.module.css';

const pad = (n) => String(n).padStart(2, '0');
const formatDateTime = (value) => {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
};

const byNewest = (a, b) =>
  new Date(b.createdAt) - new Date(a.createdAt) || Number(b.versionId) - Number(a.versionId);

const toLines = (values = []) =>
  values
    .flatMap((v) => String(v ?? '').split('\n'))
    .map((line) => line.trim())
    .filter(Boolean);

const diffLines = (before, after) => [
  ...after.filter((line) => before.includes(line)).map((text) => ({ type: 'same', text })),
  ...before.filter((line) => !after.includes(line)).map((text) => ({ type: 'removed', text })),
  ...after.filter((line) => !before.includes(line)).map((text) => ({ type: 'added', text })),
];

const compareVersions = (prevSections, curSections) => {
  let added = 0;
  let removed = 0;
  const sections = [];

  curSections.forEach((cur, index) => {
    const prev = prevSections.find((s) => s.key === cur.key);
    const groups = [];

    const pushGroup = (key, label, before, after) => {
      const lines = diffLines(before, after);
      const addedCount = lines.filter((l) => l.type === 'added').length;
      const removedCount = lines.filter((l) => l.type === 'removed').length;
      if (!addedCount && !removedCount) return; // 바뀐 게 없는 항목은 숨김
      added += addedCount;
      removed += removedCount;
      groups.push({ key, label, lines });
    };

    cur.fields.forEach((field) => {
      const prevField = prev?.fields.find((f) => f.key === field.key);
      pushGroup(field.key, field.label, toLines(prevField?.values), toLines(field.values));
    });
    (prev?.fields ?? [])
      .filter((f) => !cur.fields.some((c) => c.key === f.key))
      .forEach((f) => pushGroup(f.key, f.label, toLines(f.values), []));
    pushGroup(
      'attachments',
      '첨부 파일',
      (prev?.attachments ?? []).map((a) => a.fileName),
      cur.attachments.map((a) => a.fileName)
    );

    if (groups.length) sections.push({ key: cur.key, title: `${index + 1}. ${cur.title}`, groups });
  });

  return { sections, added, removed };
};

const SIGN = { added: '+', removed: '−', same: '' };
const SR_LABEL = { added: '추가: ', removed: '삭제: ', same: '' };

function DocumentVersions() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();

  const [project, setProject] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState('');
  const detailCache = useRef({}); 

  useEffect(() => {
    let cancelled = false;
    detailCache.current = {};

    (async () => {
      setLoading(true);
      setError('');
      try {
        const [detail, view] = await Promise.all([
          fetchHandoverDetail(projectId),
          fetchDocumentView(projectId),
        ]);
        if (cancelled) return;
        setProject(detail);
        if (!view) {
          setError('아직 인수인계서가 없어요.');
          return;
        }
        const list = [...(await fetchVersionHistory(projectId, view.documentId))].sort(byNewest);
        if (cancelled) return;
        setDocumentId(view.documentId);
        setVersions(list);
        setSelectedId(list[0]?.versionId ?? null);
      } catch {
        if (!cancelled) setError('버전 정보를 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const selectedIndex = versions.findIndex((v) => String(v.versionId) === String(selectedId));
  const selected = selectedIndex >= 0 ? versions[selectedIndex] : null;
  const previous = selectedIndex >= 0 ? versions[selectedIndex + 1] ?? null : null; // 바로 이전(더 오래된) 버전
  const latestId = versions[0]?.versionId;
  const selectedVersionId = selected?.versionId;
  const previousVersionId = previous?.versionId;

  useEffect(() => {
    setDiffError('');
    if (!selectedVersionId || !previousVersionId || !documentId) {
      setDiff(null);
      return undefined;
    }
    let cancelled = false;
    const load = (id) => {
      if (!detailCache.current[id]) {
        detailCache.current[id] = fetchVersionDetail(projectId, documentId, id).catch((err) => {
          delete detailCache.current[id];
          throw err;
        });
      }
      return detailCache.current[id];
    };

    setDiffLoading(true);
    Promise.all([load(previousVersionId), load(selectedVersionId)])
      .then(([prevDetail, curDetail]) => {
        if (!cancelled) setDiff(compareVersions(prevDetail.sections, curDetail.sections));
      })
      .catch(() => {
        if (!cancelled) {
          setDiff(null);
          setDiffError('변경 사항을 불러오지 못했어요.');
        }
      })
      .finally(() => {
        if (!cancelled) setDiffLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, documentId, selectedVersionId, previousVersionId]);
  if (loading) return <p className={styles.message}>버전 정보를 불러오는 중...</p>;
  if (error) return <p className={styles.message}>{error}</p>;

  const title = project?.title ?? '';
  const hasChanges = Boolean(diff && diff.sections.length > 0);

  let compareContent;
  if (diffLoading) {
    compareContent = <p className={styles.emptyText}>변경 사항을 불러오는 중...</p>;
  } else if (diffError) {
    compareContent = <p className={styles.emptyText}>{diffError}</p>;
  } else if (hasChanges) {
    compareContent = (
      <>
        {diff.sections.map((section) => (
          <div key={section.key} className={styles.diffSection}>
            <h3 className={styles.diffTitle}>{section.title}</h3>
            {section.groups.map((group) => (
              <div key={group.key} className={styles.diffGroup}>
                <p className={styles.groupLabel}>{group.label}</p>
                <ul className={styles.lines}>
                  {group.lines.map((line, i) => (
                    <li key={`${line.type}-${i}`} className={`${styles.line} ${styles[line.type]}`}>
                      <span className={styles.sign} aria-hidden="true">
                        {SIGN[line.type]}
                      </span>
                      <span className={styles.lineText}>
                        {SR_LABEL[line.type] && <span className={styles.srOnly}>{SR_LABEL[line.type]}</span>}
                        {line.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
        <p className={styles.summary}>
          + 추가 {diff.added}줄 &nbsp;&nbsp; − 삭제 {diff.removed}줄
        </p>
      </>
    );
  } else {
    compareContent = <p className={styles.emptyText}>해당 버전은 변경 사항이 없습니다.</p>;
  }
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title} 버전 확인</h1>
      <p className={styles.subtitle}>
        {title} · 문서 내용이 바뀔 때마다 새 버전이 자동으로 기록돼요.
      </p>

      <div className={styles.layout}>
        <section aria-labelledby="version-list-title">
          <h2 id="version-list-title" className={styles.colTitle}>
            전체 버전 ({versions.length})
          </h2>
          <ul className={styles.versionList}>
            {versions.map((v) => {
              const isSelected = String(v.versionId) === String(selectedId);
              let badge = null;
              if (v.status === 'PUBLISHED') badge = { label: '공개 승인', className: styles.badgePublished };
              else if (String(v.versionId) === String(latestId)) badge = { label: '최신', className: styles.badgeLatest };
              return (
                <li key={v.versionId}>
                  <button
                    type="button"
                    className={`${styles.versionCard} ${isSelected ? styles.selected : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(v.versionId)}
                  >
                    <span className={styles.cardTop}>
                      <strong className={styles.versionLabel}>{v.versionLabel}</strong>
                      {badge && <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>}
                      <span className={styles.cardDate}>{formatDateTime(v.createdAt)}</span>
                    </span>
                    <span className={styles.cardMeta}>작성자 {v.authorName || '-'}</span>
                    {v.description && <span className={styles.cardDesc}>{v.description}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="compare-title">
          <div className={styles.compareHead}>
            <h2 id="compare-title" className={styles.colTitle}>
              변경 사항 비교
            </h2>
            {previous && selected && (
              <span className={styles.compareRange}>
                {previous.versionLabel} → <strong>{selected.versionLabel}</strong>
              </span>
            )}
          </div>

          <div className={`${styles.compareBox} ${hasChanges ? '' : styles.compareEmpty}`} aria-live="polite">
            {compareContent}
          </div>

          {versions.length > 1 && selected && (
            <div className={styles.actions}>
              <Button
                text="이 버전으로 열람"
                variant="primary"
                className={styles.openBtn}
                onClick={() =>
                  navigate(`/handovers/${projectId}/documents?versionId=${selected.versionId}`, {
                    state: locationState,
                  })
                }
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DocumentVersions;