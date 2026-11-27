import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Tag from '../components/Tag';
import SearchImg from '../assets/images/document_search.svg';
import WarningImg from '../assets/images/document_warning.svg';
import FileImg from '../assets/images/document_file.svg';
import DownloadImg from '../assets/images/document_download.svg';
import ExternalImg from '../assets/images/document_external.svg';
import {
  fetchHandoverDetail,
  fetchDocumentView,
  recordDocumentRead,
  getAttachmentDownloadUrl,
  searchDocument,
} from '../api/handoverApi';
import { ROLE } from '../utils/handoverFormat';
import styles from './DocumentViewer.module.css';

const SEARCH_FILTERS = [
  { key: 'ALL', label: '전체' },
  { key: 'BODY', label: '본문' },
  { key: 'FILE', label: '첨부 파일' },
  { key: 'QNA', label: 'Q&A' },
];

const formatFileSize = (bytes = 0) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const Highlight = ({ text, keyword, markClassName = styles.mark }) => {
  if (!keyword) return text;
  const parts = String(text).split(new RegExp(`(${escapeRegExp(keyword)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} className={markClassName}>
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

const makeSnippet = (text, keyword, radius = 40) => {
  const value = String(text);
  const idx = value.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0 || value.length <= radius * 2) return value;
  const start = Math.max(0, idx - radius);
  const end = Math.min(value.length, idx + keyword.length + radius);
  return `${start > 0 ? '… ' : ''}${value.slice(start, end)}${end < value.length ? ' …' : ''}`;
};

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
  const [searchParams] = useSearchParams();
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
  const [flashKey, setFlashKey] = useState(null);

  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState(null); 
  const [searching, setSearching] = useState(false);
  const [searchFilter, setSearchFilter] = useState('ALL');
  const [pendingScrollKey, setPendingScrollKey] = useState(null); 
  const searchSeqRef = useRef(0);

  const sectionRefs = useRef({});
  const isPredecessor = project?.myRole === ROLE.PREDECESSOR;
  const isSearchMode = searching || searchResults !== null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      setSearchResults(null);
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
    if (!sectionKeys || isSearchMode) return undefined;
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
  }, [sectionKeys, isSearchMode]);

  const scrollToSection = useCallback((key) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveKey(key);
  }, []);

  const flashSection = useCallback((key) => {
    setFlashKey(key);
    setTimeout(() => setFlashKey((current) => (current === key ? null : current)), 1500);
  }, []);

  useEffect(() => {
    if (loading || isSearchMode || !topicId || scrolledTopicRef.current === topicId) return;
    if (!sectionRefs.current[topicId]) return;
    scrolledTopicRef.current = topicId;
    scrollToSection(topicId);
    flashSection(topicId);
  }, [loading, isSearchMode, topicId, scrollToSection, flashSection]);

  useEffect(() => {
    if (!pendingScrollKey || isSearchMode) return;
    scrollToSection(pendingScrollKey);
    flashSection(pendingScrollKey);
    setPendingScrollKey(null);
  }, [pendingScrollKey, isSearchMode, scrollToSection, flashSection]);

  const closeSearch = () => {
    searchSeqRef.current += 1; 
    setSearching(false);
    setSearchResults(null);
    setKeyword('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = keywordInput.trim();
    if (!q) {
      closeSearch();
      return;
    }

    const seq = ++searchSeqRef.current;
    setKeyword(q);
    setSearchFilter('ALL');
    setSearching(true);
    try {
      const items = await searchDocument({ projectId, keyword: q, sections });
      if (seq === searchSeqRef.current) setSearchResults(items);
    } catch {
      if (seq === searchSeqRef.current) setSearchResults([]);
    } finally {
      if (seq === searchSeqRef.current) setSearching(false);
    }
  };

  const moveToResult = (item) => {
    if (item.type === 'QNA') {
      navigate(`/handovers/${projectId}/questions/${item.threadId}`);
      return;
    }
    setSearchResults(null);
    if (item.sectionKey) setPendingScrollKey(item.sectionKey);
  };

  const handleTocClick = (key) => {
    if (isSearchMode) {
      searchSeqRef.current += 1;
      setSearching(false);
      setSearchResults(null);
      setPendingScrollKey(key);
      return;
    }
    scrollToSection(key);
  };

  const resultCounts = useMemo(() => {
    const items = searchResults ?? [];
    return {
      ALL: items.length,
      BODY: items.filter((i) => i.type === 'BODY').length,
      FILE: items.filter((i) => i.type === 'FILE').length,
      QNA: items.filter((i) => i.type === 'QNA').length,
    };
  }, [searchResults]);

  const filteredResults = useMemo(
    () => (searchResults ?? []).filter((i) => searchFilter === 'ALL' || i.type === searchFilter),
    [searchResults, searchFilter]
  );

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

  const handleDownload = async (attachment) => {
    try {
      const { url } = await getAttachmentDownloadUrl(projectId, attachment.attachmentId);
      if (!url) {
        alert('목업 모드에서는 파일을 내려받을 수 없어요.');
        return;
      }
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      alert(
        err?.response?.status === 404
          ? '파일을 찾을 수 없거나 내려받을 권한이 없어요.'
          : '파일을 내려받지 못했어요. 잠시 후 다시 시도해 주세요.'
      );
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

  const searchPanel = (
    <div className={styles.results}>
      <h2 className={styles.resultsTitle}>검색 결과</h2>
      <p className={styles.resultsDesc}>
        '{keyword}' · {title} 안에서 {resultCounts.ALL}건을 찾았어요.
      </p>

      <div className={styles.resultFilters} role="group" aria-label="검색 결과 필터">
        {SEARCH_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={styles.resultFilterBtn}
            aria-pressed={searchFilter === key}
            onClick={() => setSearchFilter(key)}
          >
            <Tag
              text={`${label} ${resultCounts[key]}`}
              variant={searchFilter === key ? 'active' : 'inactive'}
              className={styles.resultFilterTag}
            />
          </button>
        ))}
      </div>

      {searching ? (
        <p className={styles.searching}>검색 중...</p>
      ) : filteredResults.length > 0 ? (
        <ul className={styles.resultList}>
          {filteredResults.map((item) => (
            <li key={item.id} className={styles.resultItem}>
              <div className={styles.resultBody}>
                <p className={styles.resultLocation}>{item.location}</p>
                <p className={styles.resultText}>
                  <Highlight
                    text={makeSnippet(item.text, keyword)}
                    keyword={keyword}
                    markClassName={styles.markStrong}
                  />
                </p>
              </div>
              <button type="button" className={styles.resultMove} onClick={() => moveToResult(item)}>
                해당 위치로 이동
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.noResult}>
          <p className={styles.noResultTitle}>검색 결과 없음</p>
          <p className={styles.noResultDesc}>
            '{keyword}'와 일치하는 내용이 없어요. 다른 키워드로 검색하거나 전임자에게 질문해 보세요.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title} 인수인계서</h1>
        <p className={styles.subtitle}>{title} 인수인계서입니다. 자료를 확인해 보세요.</p>
      </header>

      <div className={styles.layout}>
        <form className={styles.searchRow} onSubmit={handleSearch} role="search">
          <label className={styles.searchBox}>
            <img src={SearchImg} alt="" width={20} height={20} />
            <input
              className={styles.searchInput}
              value={keywordInput}
              onChange={(e) => {
                setKeywordInput(e.target.value);
                if (!e.target.value.trim()) closeSearch(); 
              }}
              placeholder="검색어를 입력해주세요."
              aria-label="인수인계서 검색"
            />
          </label>
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
              onClick={() =>
                navigate(`/handovers/${projectId}/documents/versions`, { state: locationState })
              }
            >
              이전 버전 확인하기 <img src={ExternalImg} alt="" width={10} height={10} />
            </button>
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
                    onClick={() => handleTocClick(s.key)}
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
          {isSearchMode ? (
            searchPanel
          ) : (
            <>
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
                <Button
                  text="확인"
                  variant="white"
                  className={styles.confirmBtn}
                  onClick={() => navigate('/handovers')}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentViewer;