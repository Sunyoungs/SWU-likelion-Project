import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import SearchImg from '../assets/images/document_search.svg';
import WarningImg from '../assets/images/document_warning.svg';
import FileImg from '../assets/images/document_file.svg';
import DownloadImg from '../assets/images/document_download.svg';
import ExternalImg from '../assets/images/document_external.svg';
import {
  fetchHandoverDetail,
  fetchDocumentView,
  fetchDocumentVersions,
  recordDocumentRead,
  acknowledgeDocument,
  createRevisionDraft,
  updateDocumentDraft,
  getAttachmentDownloadUrl,
} from '../api/handoverApi';
import { ROLE, formatDate } from '../utils/handoverFormat';
import styles from './DocumentViewer.module.css';

const formatFileSize = (bytes = 0) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const Highlight = ({ text, keyword }) => {
  if (!keyword) return text;
  const parts = String(text).split(new RegExp(`(${escapeRegExp(keyword)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} className={styles.mark}>
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

const sectionText = (s) =>
  [s.title, ...s.fields.flatMap((f) => [f.label, ...f.values]), ...s.attachments.map((a) => a.fileName)]
    .join(' ')
    .toLowerCase();

const Field = ({ field, editable, keyword, onChange, onAdd }) => {
  const labelId = `label-${field.key}`;
  const values = field.values.length ? field.values : [''];

  return (
    <div className={styles.field}>
      <p className={styles.fieldLabel} id={labelId}>
        {field.label}
      </p>
      <div className={styles.valueList}>
        {values.map((value, idx) => {
          if (editable) {
            const common = {
              className: `${styles.input} ${field.multiline ? styles.multiline : ''}`,
              value,
              placeholder: '입력해 주세요.',
              'aria-labelledby': labelId,
              onChange: (e) => onChange(idx, e.target.value),
            };
            return field.multiline ? <textarea key={idx} {...common} /> : <input key={idx} {...common} />;
          }
          return (
            <div
              key={idx}
              className={`${styles.valueBox} ${field.multiline ? styles.multiline : ''} ${
                value ? '' : styles.emptyValue
              }`}
            >
              {value ? <Highlight text={value} keyword={keyword} /> : '작성된 내용이 없어요.'}
            </div>
          );
        })}
      </div>
      {editable && !field.multiline && (
        <div className={styles.addRow}>
          <button type="button" className={styles.addBtn} onClick={onAdd}>
            추가
          </button>
        </div>
      )}
    </div>
  );
};

function DocumentViewer() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const versionIdParam = searchParams.get('versionId');

  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const returnTo = locationState?.returnTo;
  const topicId = locationState?.topicId;
  const scrolledTopicRef = useRef(null);

  const [project, setProject] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [version, setVersion] = useState(null);
  const [sections, setSections] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeKey, setActiveKey] = useState(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [flashKey, setFlashKey] = useState(null);

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const sectionRefs = useRef({});
  const isPredecessor = project?.myRole === ROLE.PREDECESSOR;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      setNotice('');
      setVersionsOpen(false);
      try {
        const [detail, view] = await Promise.all([
          fetchHandoverDetail(projectId),
          fetchDocumentView(projectId, versionIdParam),
        ]);
        if (cancelled) return;

        setProject(detail);
        if (!view) {
          setError('아직 공개된 인수인계서가 없어요.');
          return;
        }
        setDocumentId(view.documentId);
        setVersion(view.version);
        setSections(view.version.sections);
        setActiveKey(view.version.sections[0]?.key ?? null);
        if (detail.myRole === ROLE.SUCCESSOR) {
          recordDocumentRead(projectId, view.documentId, view.version.versionId).catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        setError(
          status === 403 || status === 404
            ? '아직 공개된 인수인계서가 없어요. 전임자가 공개 승인하면 열람할 수 있어요.'
            : '인수인계서를 불러오지 못했어요.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, versionIdParam]);
  const sectionKeys = sections.map((s) => s.key).join('|');
  useEffect(() => {
    if (!sectionKeys) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveKey(visible[0].target.dataset.sectionKey);
      },
      { rootMargin: '-15% 0px -65% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sectionKeys]);

  const scrollToSection = useCallback((key) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveKey(key);
  }, []);

  useEffect(() => {
    if (loading || !topicId || scrolledTopicRef.current === topicId) return;
    if (!sectionRefs.current[topicId]) return;
    scrolledTopicRef.current = topicId;
    scrollToSection(topicId);
    setFlashKey(topicId);
    setTimeout(() => setFlashKey(null), 1500);
  }, [loading, topicId, scrollToSection]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = keywordInput.trim();
    setKeyword(q);
    setSearchMessage('');
    if (!q) return;

    const target = sections.find((s) => sectionText(s).includes(q.toLowerCase()));
    if (!target) {
      setSearchMessage(`'${q}'에 해당하는 내용이 없어요.`);
      return;
    }
    scrollToSection(target.key);
    setFlashKey(target.key);
    setTimeout(() => setFlashKey(null), 1200);
  };

  const toggleVersions = async () => {
    if (versionsOpen) {
      setVersionsOpen(false);
      return;
    }
    setVersionsOpen(true);
    try {
      const list = await fetchDocumentVersions(projectId, documentId);
      setVersions(isPredecessor ? list : list.filter((v) => v.status === 'PUBLISHED'));
    } catch {
      setVersions([]);
    }
  };

  const selectVersion = (versionId) => {
    setVersionsOpen(false);
    setSearchParams({ versionId: String(versionId) }, { state: locationState });
  };

  const updateField = (sectionKey, fieldKey, updater) =>
    setSections((prev) =>
      prev.map((s) =>
        s.key !== sectionKey
          ? s
          : { ...s, fields: s.fields.map((f) => (f.key !== fieldKey ? f : updater(f))) }
      )
    );

  const changeFieldValue = (sectionKey, fieldKey, idx, value) =>
    updateField(sectionKey, fieldKey, (f) => {
      const values = f.values.length ? [...f.values] : [''];
      values[idx] = value;
      return { ...f, values };
    });

  const addFieldValue = (sectionKey, fieldKey) =>
    updateField(sectionKey, fieldKey, (f) => ({ ...f, values: [...f.values, ''] }));

  const handleConfirm = async () => {
    if (!version || saving) return;
    setSaving(true);
    setNotice('');
    try {
      if (isPredecessor) {
        let targetVersionId = version.versionId;
        if (version.status === 'PUBLISHED') {
          const created = await createRevisionDraft(projectId, documentId);
          targetVersionId = created?.versionId ?? created?.id;
        }
        await updateDocumentDraft(projectId, documentId, targetVersionId, {
          sections: sections.map((s) => ({
            key: s.key,
            fields: s.fields.map((f) => ({
              key: f.key,
              values: f.values.filter((v) => v.trim() !== ''),
            })),
          })),
        });
        if (String(targetVersionId) !== String(version.versionId)) {
          setSearchParams({ versionId: String(targetVersionId) }, { state: locationState });
        }
        setNotice('수정 초안을 저장했어요. 후임자에게는 공개 승인 후 보여요.');
      } else {
        await acknowledgeDocument(projectId, documentId, version.versionId);
        setVersion((v) => ({ ...v, acknowledged: true }));
        setNotice('인수인계서 숙지 확인이 기록되었어요.');
      }
    } catch {
      setNotice('처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const { url } = await getAttachmentDownloadUrl(projectId, attachment.attachmentId);
      if (!url) {
        alert('목업 모드에서는 파일을 내려받을 수 없어요.');
        return;
      }
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('파일을 내려받지 못했어요.');
    }
  };

  const returnButton = returnTo && (
    <Button
      text="해설로 돌아가기"
      variant="primary"
      className={styles.returnBtn}
      onClick={() => navigate(returnTo.path, { state: returnTo.state })}
    />
  );

  if (loading || error || !version) {
    return (
      <div className={styles.messageWrap}>
        <p className={styles.message}>{loading ? '인수인계서를 불러오는 중...' : error}</p>
        {!loading && returnButton}
      </div>
    );
  }

  const title = project?.title ?? '';
  const isDraft = version.status === 'DRAFT';
  const confirmDisabled = saving || (!isPredecessor && version.acknowledged);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title} 인수인계서</h1>
        <p className={styles.subtitle}>{title} 인수인계서입니다. 자료를 확인해 보세요.</p>
      </header>

      <div className={styles.layout}>
        {/* 검색 */}
        <form className={styles.searchRow} onSubmit={handleSearch} role="search">
          <label className={styles.searchBox}>
            <img src={SearchImg} alt="" width={20} height={20} />
            <input
              className={styles.searchInput}
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="검색어를 입력해주세요."
              aria-label="인수인계서 검색"
            />
          </label>
          {searchMessage && <p className={styles.searchMessage}>{searchMessage}</p>}
        </form>

        <aside className={styles.aside}>
          <div className={styles.versionCard}>
            <div className={styles.versionTop}>
              <strong className={styles.versionLabel}>{version.versionLabel}</strong>
              <span className={`${styles.versionBadge} ${isDraft ? styles.draftBadge : ''}`}>
                {isDraft ? '초안' : '공개 승인'}
              </span>
            </div>
            <p className={styles.versionMeta}>작성자 {version.authorName}</p>
            {version.description && <p className={styles.versionDesc}>{version.description}</p>}
            <button
              type="button"
              className={styles.prevBtn}
              onClick={toggleVersions}
              aria-expanded={versionsOpen}
            >
              이전 버전 확인하기 <img src={ExternalImg} alt="" width={10} height={10} />
            </button>
            {versionsOpen && (
              <ul className={styles.versionList}>
                {versions.length === 0 && <li className={styles.versionEmpty}>다른 버전이 없어요.</li>}
                {versions.map((v) => {
                  const current = String(v.versionId) === String(version.versionId);
                  return (
                    <li key={v.versionId}>
                      <button
                        type="button"
                        className={`${styles.versionItem} ${current ? styles.versionCurrent : ''}`}
                        onClick={() => selectVersion(v.versionId)}
                        aria-current={current ? 'true' : undefined}
                      >
                        <span>{v.versionLabel}</span>
                        <span className={styles.versionDate}>
                          {v.status === 'DRAFT' ? '초안' : formatDate(v.createdAt)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <nav aria-label="목차">
            <p className={styles.tocLabel}>목차</p>
            <ol className={styles.tocList}>
              {sections.map((s, i) => (
                <li key={s.key}>
                  <button
                    type="button"
                    className={`${styles.tocItem} ${activeKey === s.key ? styles.tocActive : ''}`}
                    aria-current={activeKey === s.key ? 'true' : undefined}
                    onClick={() => scrollToSection(s.key)}
                  >
                    {i + 1}. {s.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {returnButton}
        </aside>
        <div className={styles.content}>
          {sections.map((section, i) => (
            <section
              key={section.key}
              id={`section-${section.key}`}
              data-section-key={section.key}
              ref={(el) => {
                sectionRefs.current[section.key] = el;
              }}
              className={`${styles.section} ${flashKey === section.key ? styles.flash : ''}`}
              aria-labelledby={`heading-${section.key}`}
            >
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle} id={`heading-${section.key}`}>
                  {i + 1}. <Highlight text={section.title} keyword={keyword} />
                </h2>
                {section.basis && <p className={styles.basis}>근거 : {section.basis}</p>}
              </div>

              {section.warning && (
                <div className={styles.warning} role="note">
                  <img src={WarningImg} alt="" width={18} height={18} />
                  <span>{section.warning}</span>
                </div>
              )}

              {section.fields.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  editable={isPredecessor}
                  keyword={keyword}
                  onChange={(idx, value) => changeFieldValue(section.key, field.key, idx, value)}
                  onAdd={() => addFieldValue(section.key, field.key)}
                />
              ))}

              {section.attachments.length > 0 && (
                <ul className={styles.files}>
                  {section.attachments.map((file) => (
                    <li key={file.attachmentId} className={styles.file}>
                      <span className={styles.fileIcon}>
                        <img src={FileImg} alt="" width={20} height={20} />
                      </span>
                      <span className={styles.fileName}>
                        <Highlight text={file.fileName} keyword={keyword} />
                      </span>
                      <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        className={styles.downloadBtn}
                        onClick={() => handleDownload(file)}
                        aria-label={`${file.fileName} 다운로드`}
                      >
                        <img src={DownloadImg} alt="" width={20} height={20} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className={styles.footer}>
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}
            <Button
              text={!isPredecessor && version.acknowledged ? '숙지 완료' : saving ? '처리 중...' : '확인'}
              variant="white"
              className={styles.confirmBtn}
              disabled={confirmDisabled}
              onClick={handleConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentViewer;