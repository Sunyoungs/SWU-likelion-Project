import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import styles from './QnACreate.module.css';
import ArrowIcon from '../assets/images/QnA_sortArrow.svg';
import UploadIcon from '../assets/images/QnA_upload.svg';
import FileImageIcon from '../assets/images/QnA_fileImage.svg';
import FileRemoveIcon from '../assets/images/QnA_fileRemove.svg';
import InfoIcon from '../assets/images/QnA_info.svg';
import BulletIcon from '../assets/images/QnA_bullet.svg';
import {
  getMyRole,
  getTopics,
  getQuestionDetail,
  createQuestion,
  updateQuestion,
  CONTENT_MAX_LENGTH,
} from '../api/questions';
import { useApi } from '../hooks/useApi';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif';
const CONTENT_PLACEHOLDER =
  '질문 내용을 구체적으로 입력하세요.\n관련 업무 항목이나 상황을 함께 적으면 전임자가 더 정확하게 답변할 수 있습니다.';

// 348000 → '348KB'
const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;

// 질문 등록(/questions/create)과 질문 수정(/questions/:threadId/edit)이 함께 쓰는 화면
function QnACreate() {
  const { projectId, threadId } = useParams();
  const isEdit = Boolean(threadId);

  const { data: me } = useApi(() => getMyRole(projectId), [projectId]);
  const { data: topics } = useApi(() => getTopics(projectId), [projectId]);
  const { data: question, error } = useApi(
    () => (isEdit ? getQuestionDetail(projectId, threadId) : Promise.resolve(null)),
    [projectId, threadId],
  );

  if (error) return <p>질문을 불러오지 못했어요.</p>;
  if (!me || !topics || (isEdit && !question)) return null;
  return <QnAForm key={threadId ?? 'new'} me={me} topics={topics} question={question} />;
}

function QnAForm({ me, topics, question }) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const isEdit = Boolean(question);

  const [topicId, setTopicId] = useState(question?.topicId ?? null);
  const [title, setTitle] = useState(question?.title ?? '');
  const [content, setContent] = useState(question?.content ?? '');
  // 수정 시 이미 올라간 첨부(서버) + 새로 고른 파일(File)
  const [attachments, setAttachments] = useState(question?.attachments ?? []);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const topicRef = useRef(null);
  const fileInputRef = useRef(null);

  // 드롭다운 밖을 누르면 닫는다
  useEffect(() => {
    if (!topicOpen) return undefined;
    const close = (e) => {
      if (!topicRef.current?.contains(e.target)) setTopicOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [topicOpen]);

  const selectedTopic = topics.find((t) => t.topicId === topicId);
  const canSubmit = topicId !== null && title.trim() && content.trim() && !submitting;

  const addFiles = (fileList) => {
    const picked = Array.from(fileList);
    const tooLarge = picked.filter((f) => f.size > MAX_FILE_SIZE);
    setFileError(tooLarge.length ? '10MB를 넘는 파일은 첨부할 수 없어요.' : '');
    setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= MAX_FILE_SIZE)]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const body = { topicId, title: title.trim(), content: content.trim(), files, attachments };
    try {
      if (isEdit) {
        await updateQuestion(projectId, question.threadId, body);
        navigate(`/handovers/${projectId}/questions/${question.threadId}`);
      } else {
        const { threadId } = await createQuestion(projectId, body);
        navigate(`/handovers/${projectId}/questions/${threadId}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 화면에 보여줄 첨부 목록: 기존 첨부 + 새 파일
  const fileItems = [
    ...attachments.map((a, i) => ({ key: `a-${i}`, name: a.name, size: a.size, remove: () => setAttachments((prev) => prev.filter((_, j) => j !== i)) })),
    ...files.map((f, i) => ({ key: `f-${i}`, name: f.name, size: f.size, remove: () => setFiles((prev) => prev.filter((_, j) => j !== i)) })),
  ];

  return (
    <div className={styles.page}>
      <div className={styles.form}>
        <div className={styles.head}>
          <h1 className={styles.title}>{isEdit ? '질문 수정' : '질문 등록'}</h1>
          {me.teamName && <p className={styles.subtitle}>{me.teamName} 인수인계</p>}
        </div>

        <div className={styles.fields}>
          {/* 관련 항목 */}
          <div className={styles.field}>
            <span className={styles.label} id="qna-topic-label">
              관련 항목<span className={styles.required}>*</span>
            </span>
            <div className={styles.select} ref={topicRef}>
              <button
                type="button"
                className={`${styles.selectButton} ${topicOpen ? styles.selectButtonOpen : ''}`}
                onClick={() => setTopicOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={topicOpen}
                aria-labelledby="qna-topic-label"
              >
                <span className={selectedTopic ? styles.selectValue : styles.placeholder}>
                  {selectedTopic ? `${selectedTopic.topicId}. ${selectedTopic.topicName}` : '관련 항목'}
                </span>
                <img src={ArrowIcon} alt="" className={`${styles.selectArrow} ${topicOpen ? styles.selectArrowOpen : ''}`} />
              </button>
              {topicOpen && (
                <ul className={styles.options} role="listbox" aria-labelledby="qna-topic-label">
                  {topics.map((t) => (
                    <li
                      key={t.topicId}
                      role="option"
                      aria-selected={t.topicId === topicId}
                      className={`${styles.option} ${t.topicId === topicId ? styles.optionSelected : ''}`}
                      onClick={() => {
                        setTopicId(t.topicId);
                        setTopicOpen(false);
                      }}
                    >
                      {t.topicId}. {t.topicName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 질문 제목 */}
          <div className={styles.field}>
            <label htmlFor="qna-title" className={styles.label}>
              질문 제목<span className={styles.required}>*</span>
            </label>
            <input
              id="qna-title"
              className={styles.input}
              placeholder="질문 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 질문 내용 */}
          <div className={styles.field}>
            <label htmlFor="qna-content" className={styles.label}>
              질문 내용<span className={styles.required}>*</span>
            </label>
            <textarea
              id="qna-content"
              className={`${styles.input} ${styles.textarea}`}
              placeholder={CONTENT_PLACEHOLDER}
              value={content}
              maxLength={CONTENT_MAX_LENGTH}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className={styles.counter}>{content.length} / {CONTENT_MAX_LENGTH}</p>
          </div>

          {/* 첨부 */}
          <div className={styles.field}>
            <span className={styles.label}>첨부 (선택)</span>
            <div
              className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${fileItems.length ? styles.dropzoneFilled : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className={styles.dropGuide}>
                <p className={styles.dropText}>
                  <img src={UploadIcon} alt="" />
                  파일을 여기로 끌어오거나,
                  <button type="button" className={styles.fileLink} onClick={() => fileInputRef.current?.click()}>
                    파일을 선택
                  </button>
                  해 첨부하세요.
                </p>
                <p className={styles.dropHint}>최대 10MB까지 첨부 가능 (PDF, PNG, JPG, JPEG, GIF 등)</p>
                {fileError && <p className={styles.fileError}>{fileError}</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              {fileItems.map((item) => (
                <div key={item.key} className={styles.file}>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileIcon}>
                      <img src={FileImageIcon} alt="" />
                    </span>
                    <span className={styles.fileName}>{item.name}</span>
                    <span className={styles.fileSize}>{formatSize(item.size)}</span>
                  </div>
                  <button type="button" className={styles.fileRemove} onClick={item.remove} aria-label={`${item.name} 삭제`}>
                    <img src={FileRemoveIcon} alt="" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            text={isEdit ? '질문 수정' : '질문 등록'}
            variant="primary"
            className={`${styles.submit} ${canSubmit ? '' : styles.submitDisabled}`}
            onClick={handleSubmit}
          />
        </div>
      </div>

      {/* 오른쪽 작성 팁 */}
      <aside className={styles.tips}>
        <h2 className={styles.tipsTitle}>
          <img src={InfoIcon} alt="" />
          좋은 질문 작성 팁
        </h2>
        <ul className={styles.tipList}>
          <li>
            <img src={BulletIcon} alt="" className={styles.bullet} />
            <span>관련 업무 항목과 상황을 함께 적으면<br />전임자가 더 정확하게 답변할 수 있어요.</span>
          </li>
          <li>
            <img src={BulletIcon} alt="" className={styles.bullet} />
            <span>등록하면 전임자에게 바로 알림이 가요.</span>
          </li>
          <li>
            <img src={BulletIcon} alt="" className={styles.bullet} />
            <span>내용 없이 제목만으로는 등록할 수 없어요.</span>
          </li>
        </ul>
      </aside>
    </div>
  );
}

export default QnACreate;
