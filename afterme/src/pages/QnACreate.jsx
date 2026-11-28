import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import AttachmentItem from '../components/AttachmentItem';
import styles from './QnACreate.module.css';
import ArrowIcon from '../assets/images/QnA_sortArrow.svg';
import UploadIcon from '../assets/images/QnA_upload.svg';
import InfoIcon from '../assets/images/QnA_info.svg';
import BulletIcon from '../assets/images/QnA_bullet.svg';
import {
  getMyRole,
  getTopics,
  getQuestionDetail,
  createQuestion,
  updateQuestion,
  openAttachment,
  topicLabel,
  CONTENT_MAX_LENGTH,
  TOPIC_EDIT_SUPPORTED,
} from '../api/questions';
import LoadState from '../components/LoadState';
import { useApi } from '../hooks/useApi';
import { submitErrorMessage } from '../utils/apiError';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif';
// 서버가 받는 형식 (끌어다 놓은 파일은 accept가 걸러 주지 않아서 직접 확인한다)
const ALLOWED_TYPE = /\.(pdf|png|jpe?g|gif)$/i;

// 첨부 일부를 처리하지 못했을 때 상세 화면에 보여 줄 안내
const attachmentNotice = ({ failedFiles = [], failedRemovals = [] }) => {
  const parts = [];
  if (failedFiles.length) parts.push(`첨부파일을 올리지 못했어요: ${failedFiles.join(', ')}`);
  if (failedRemovals.length) parts.push(`첨부파일을 삭제하지 못했어요: ${failedRemovals.join(', ')}`);
  return parts.length ? `질문은 저장됐어요. ${parts.join(' / ')}. 질문 수정에서 다시 시도해 주세요.` : null;
};
const CONTENT_PLACEHOLDER =
  '질문 내용을 구체적으로 입력하세요.\n관련 업무 항목이나 상황을 함께 적으면 전임자가 더 정확하게 답변할 수 있습니다.';

// 질문 등록(/questions/create)과 질문 수정(/questions/:threadId/edit)이 함께 쓰는 화면
function QnACreate() {
  const { projectId, threadId } = useParams();
  const isEdit = Boolean(threadId);

  const me$ = useApi(() => getMyRole(projectId), [projectId]);
  const topics$ = useApi(() => getTopics(projectId), [projectId]);
  const question$ = useApi(
    () => (isEdit ? getQuestionDetail(projectId, threadId) : Promise.resolve(null)),
    [projectId, threadId],
  );

  const requests = [me$, topics$, question$];
  const failed = requests.find((r) => r.error);
  if (failed || requests.some((r) => r.loading)) {
    return (
      <LoadState
        loading={!failed}
        error={failed?.error}
        what={isEdit ? '질문' : '질문 작성 정보'}
        onRetry={() => requests.filter((r) => r.error).forEach((r) => r.reload())}
      />
    );
  }
  return <QnAForm key={threadId ?? 'new'} me={me$.data} topics={topics$.data} question={question$.data} />;
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
  const [submitError, setSubmitError] = useState(null);

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
  // 실제 서버는 질문 수정 때 관련 항목 변경을 받지 않는다
  const topicLocked = isEdit && !TOPIC_EDIT_SUPPORTED;
  const canSubmit = topicId !== null && title.trim() && content.trim() && !submitting;

  const addFiles = (fileList) => {
    const picked = Array.from(fileList);
    const wrongType = picked.some((f) => !ALLOWED_TYPE.test(f.name));
    const tooLarge = picked.some((f) => f.size > MAX_FILE_SIZE);
    setFileError(
      wrongType
        ? 'PDF, PNG, JPG, GIF 파일만 첨부할 수 있어요.'
        : tooLarge
          ? '10MB를 넘는 파일은 첨부할 수 없어요.'
          : '',
    );
    setFiles((prev) => [...prev, ...picked.filter((f) => ALLOWED_TYPE.test(f.name) && f.size <= MAX_FILE_SIZE)]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    const body = {
      topicId,
      title: title.trim(),
      content: content.trim(),
      files,
      attachments,
      originalAttachments: question?.attachments ?? [],
      revision: question?.revision,
    };
    try {
      // 질문이 저장된 뒤 첨부 일부만 실패하면, 같은 질문이 또 등록되지 않도록 상세 화면으로 넘어가 안내한다
      if (isEdit) {
        const result = await updateQuestion(projectId, question.threadId, body);
        navigate(`/handovers/${projectId}/questions/${question.threadId}`, { state: { notice: attachmentNotice(result) } });
      } else {
        const { threadId, ...result } = await createQuestion(projectId, body);
        navigate(`/handovers/${projectId}/questions/${threadId}`, { state: { notice: attachmentNotice(result) } });
      }
    } catch (err) {
      // 실패해도 쓴 내용은 그대로 두고, 버튼 위에 안내만 띄운다
      setSubmitError(
        submitErrorMessage(err, {
          conflict: isEdit
            ? '그 사이 질문이 바뀌었어요. 새로고침한 뒤 다시 수정해 주세요.'
            : '지금은 이 항목에 질문을 등록할 수 없어요. 잠시 후 다시 시도해 주세요.',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 화면에 보여줄 첨부 목록: 기존 첨부 + 새 파일
  const fileItems = [
    ...attachments.map((a, i) => ({
      key: `a-${a.id ?? i}`,
      name: a.name,
      size: a.size,
      open: a.url && (() => openAttachment(a).catch(() => setFileError(`'${a.name}' 파일을 열지 못했어요.`))),
      remove: () => setAttachments((prev) => prev.filter((_, j) => j !== i)),
    })),
    ...files.map((f, i) => ({
      key: `f-${i}`,
      name: f.name,
      size: f.size,
      remove: () => setFiles((prev) => prev.filter((_, j) => j !== i)),
    })),
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
                disabled={topicLocked}
                aria-describedby={topicLocked ? 'qna-topic-locked' : undefined}
                aria-haspopup="listbox"
                aria-expanded={topicOpen}
                aria-labelledby="qna-topic-label"
              >
                <span className={selectedTopic ? styles.selectValue : styles.placeholder}>
                  {selectedTopic ? topicLabel(selectedTopic) : isEdit ? topicLabel(question) : '관련 항목'}
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
                      {topicLabel(t)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {topicLocked && (
              <p id="qna-topic-locked" className={styles.hint}>
                질문을 수정할 때는 관련 항목을 바꿀 수 없어요.
              </p>
            )}
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
                <AttachmentItem key={item.key} name={item.name} size={item.size} onOpen={item.open} onRemove={item.remove} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          {submitError && (
            <p className={styles.submitError} role="alert">
              {submitError}
            </p>
          )}
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
