import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import QnAStatus from '../components/QnAStatus';
import AttachmentItem from '../components/AttachmentItem';
import styles from './QnADetail.module.css';
import BackIcon from '../assets/images/QnA_back.svg';
import DocumentIcon from '../assets/images/QnA_document.svg';
import CheckIcon from '../assets/images/QnA_check.svg';
import SuccessorAvatar from '../assets/images/QnA_avatarSuccessor.svg';
import PredecessorAvatar from '../assets/images/QnA_avatarPredecessor.svg';
import {
  getMyRole,
  getQuestionList,
  getQuestionDetail,
  createReply,
  updateReply,
  formatRelativeTime,
  topicLabel,
  ROLE_LABEL,
  REPLY_EDIT_SUPPORTED,
} from '../api/questions';
import LoadState from '../components/LoadState';
import { useApi } from '../hooks/useApi';
import { submitErrorMessage } from '../utils/apiError';

const ANSWER_PLACEHOLDER =
  '답변을 구체적으로 입력하세요.\n관련 업무 항목이나 상황을 함께 적으면 후임자가 더 명확하게 이해할 수 있습니다.';

// 작성자 · 시간 · 말풍선. role: 'successor'(질문, 보라) | 'predecessor'(답변, 파랑)
function ThreadMessage({ role, authorName, createdAt, children }) {
  const isAnswer = role === 'predecessor';
  return (
    <div className={styles.message}>
      <div className={styles.messageHead}>
        <span className={`${styles.avatar} ${isAnswer ? styles.avatarAnswer : ''}`}>
          <img src={isAnswer ? PredecessorAvatar : SuccessorAvatar} alt="" />
        </span>
        <span className={styles.messageAuthor}>{authorName} ({ROLE_LABEL[role]})</span>
        <span className={styles.messageTime}>{formatRelativeTime(createdAt)}</span>
      </div>
      <div className={styles.bubbleWrap}>{children}</div>
    </div>
  );
}

function QnADetail() {
  const { projectId, threadId } = useParams();
  // 답변 등록 · 수정 후 상세와 목록을 다시 불러오기 위한 키
  const [reloadKey, setReloadKey] = useState(0);

  const me$ = useApi(() => getMyRole(projectId), [projectId]);
  const me = me$.data;
  const { data: questions } = useApi(() => getQuestionList(projectId), [projectId, reloadKey]);
  const { data: detail, loading, error, reload } = useApi(
    () => getQuestionDetail(projectId, threadId),
    [projectId, threadId, reloadKey],
  );

  if (!me) return <LoadState loading={me$.loading} error={me$.error} what="질문" onRetry={me$.reload} />;
  return (
    <QnADetailView
      // 다른 질문으로 이동하면 입력 상태를 초기화한다
      key={threadId}
      me={me}
      questions={questions ?? []}
      detail={detail}
      loading={loading}
      error={error}
      onRetry={reload}
      onChanged={() => setReloadKey((k) => k + 1)}
    />
  );
}

function QnADetailView({ me, questions, detail, loading, error, onRetry, onChanged }) {
  const navigate = useNavigate();
  const { projectId, threadId } = useParams();
  const isPredecessor = me.role === 'predecessor';

  const [answer, setAnswer] = useState('');
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const canSubmit = answer.trim().length > 0 && !submitting;

  const submit = async (request) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 답변 등록은 질문 버전(revision)을 함께 보낸다. 그 사이 질문이 수정됐으면 서버가 거절한다.
      await request(projectId, threadId, answer.trim(), detail.revision);
      setAnswer('');
      setEditingAnswer(false);
      onChanged();
    } catch (err) {
      // 실패해도 쓴 답변은 그대로 두고, 버튼 위에 안내만 띄운다
      setSubmitError(
        submitErrorMessage(err, { conflict: '그 사이 질문이 수정됐어요. 새로고침한 뒤 다시 등록해 주세요.' }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEditAnswer = () => {
    setAnswer(detail.answer.content);
    setEditingAnswer(true);
  };

  const cancelEditAnswer = () => {
    setAnswer('');
    setEditingAnswer(false);
  };

  // 하단 버튼: 역할과 질문 상태에 따라 바뀐다
  let footer = null;
  if (detail) {
    if (!isPredecessor) {
      // 후임자: 아직 답변이 없는 내 질문만 수정할 수 있다
      if (detail.status === 'unresolved') {
        footer = (
          <Button
            text="질문 수정"
            variant="white"
            className={styles.footerButton}
            onClick={() => navigate(`/handovers/${projectId}/questions/${threadId}/edit`)}
          />
        );
      }
    } else if (!detail.answer) {
      footer = (
        <Button
          text="답변 등록"
          variant={canSubmit ? 'primary' : 'deactivate'}
          className={styles.footerButton}
          onClick={() => submit(createReply)}
        />
      );
    } else if (editingAnswer) {
      footer = (
        <div className={styles.footerGroup}>
          <Button text="취소" variant="white" className={styles.footerButton} onClick={cancelEditAnswer} />
          <Button
            text="수정 완료"
            variant={canSubmit ? 'primary' : 'deactivate'}
            className={styles.footerButton}
            onClick={() => submit(updateReply)}
          />
        </div>
      );
    } else if (REPLY_EDIT_SUPPORTED) {
      footer = <Button text="답변 수정" variant="white" className={styles.footerButton} onClick={startEditAnswer} />;
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate(`/handovers/${projectId}/questions`)}
          aria-label="질문 목록으로"
        >
          <img src={BackIcon} alt="" />
          <h1 className={styles.title}>Q&amp;A</h1>
        </button>
        {me.teamName && <p className={styles.subtitle}>{me.teamName} 인수인계</p>}
      </div>

      <div className={styles.body}>
        {/* 왼쪽: 문항 목록 */}
        <aside className={styles.side}>
          <p className={styles.sideLabel}>문항 목록</p>
          <ul className={styles.cards}>
            {questions.map((q) => {
              const active = String(q.threadId) === threadId;
              return (
                <li key={q.threadId}>
                  <button
                    type="button"
                    className={`${styles.card} ${active ? styles[`${q.status}Active`] : ''}`}
                    onClick={() => navigate(`/handovers/${projectId}/questions/${q.threadId}`)}
                  >
                    <span className={styles.cardTop}>
                      <QnAStatus variant={q.status} />
                      <span className={styles.cardTime}>{formatRelativeTime(q.createdAt)}</span>
                    </span>
                    <span className={styles.cardTitle}>{q.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* 오른쪽: 질문 상세 */}
        <section className={styles.main}>
          {(loading || error) && <LoadState loading={loading} error={error} what="질문" onRetry={onRetry} />}
          {detail && (
            <>
              <div className={styles.content}>
                <div className={styles.question}>
                  <div className={styles.questionHead}>
                    <div className={styles.questionTitleRow}>
                      <img src={DocumentIcon} alt="" />
                      <h2 className={styles.questionTitle}>{detail.title}</h2>
                    </div>
                    <p className={styles.meta}>관련 항목 · {topicLabel(detail)}</p>
                  </div>

                  <div className={styles.thread}>
                    {/* 질문자가 참조한 인수인계서 원문 (서버가 주지 않으면 숨긴다) */}
                    {detail.document && (
                      <div className={styles.document}>
                        <p className={styles.documentLabel}>인수인계서 원문 · {topicLabel(detail.document)}</p>
                        <p className={styles.documentText}>{detail.document.excerpt}</p>
                      </div>
                    )}

                    <ThreadMessage role="successor" authorName={detail.authorName} createdAt={detail.createdAt}>
                      <p className={styles.bubble}>{detail.content}</p>
                      {detail.attachments?.length > 0 && (
                        <div className={styles.attachments}>
                          {detail.attachments.map((file) => (
                            <AttachmentItem key={file.id} name={file.name} size={file.size} href={file.url} />
                          ))}
                        </div>
                      )}
                    </ThreadMessage>

                    {detail.answer && (
                      <ThreadMessage
                        role="predecessor"
                        authorName={detail.answer.authorName}
                        createdAt={detail.answer.createdAt}
                      >
                        {editingAnswer ? (
                          <textarea
                            className={`${styles.bubble} ${styles.bubbleAnswer} ${styles.bubbleInput}`}
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            aria-label="답변 수정"
                            autoFocus
                          />
                        ) : (
                          <p className={`${styles.bubble} ${styles.bubbleAnswer}`}>{detail.answer.content}</p>
                        )}
                      </ThreadMessage>
                    )}
                  </div>
                </div>

                {/* 답변이 반영된 인수인계서 안내 (서버 제공 값) */}
                {detail.answer?.reflection && (
                  <p className={styles.reflection}>
                    <img src={CheckIcon} alt="" />
                    이 답변은 인수인계서 {detail.answer.reflection.version} '{detail.answer.reflection.topicId}.{' '}
                    {detail.answer.reflection.topicName}'에 반영되었고, 완성도 점수(질문 해결률)에 포함됐어요.
                  </p>
                )}

                {/* 전임자 · 답변 전: 답변 입력 */}
                {isPredecessor && !detail.answer && (
                  <>
                    <hr className={styles.divider} />
                    <div className={styles.answer}>
                      <label htmlFor="qna-answer" className={styles.answerLabel}>답변 하기</label>
                      <textarea
                        id="qna-answer"
                        className={styles.answerInput}
                        placeholder={ANSWER_PLACEHOLDER}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              {submitError && (
                <p className={styles.submitError} role="alert">
                  {submitError}
                </p>
              )}
              {footer}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default QnADetail;
