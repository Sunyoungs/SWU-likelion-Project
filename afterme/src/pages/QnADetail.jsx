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
import { useApi } from '../hooks/useApi';

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

  const { data: me } = useApi(() => getMyRole(projectId), [projectId]);
  const { data: questions } = useApi(() => getQuestionList(projectId), [projectId, reloadKey]);
  const { data: detail, error } = useApi(
    () => getQuestionDetail(projectId, threadId),
    [projectId, threadId, reloadKey],
  );

  if (!me) return null;
  return (
    <QnADetailView
      // 다른 질문으로 이동하면 입력 상태를 초기화한다
      key={threadId}
      me={me}
      questions={questions ?? []}
      detail={detail}
      error={error}
      onChanged={() => setReloadKey((k) => k + 1)}
    />
  );
}

function QnADetailView({ me, questions, detail, error, onChanged }) {
  const navigate = useNavigate();
  const { projectId, threadId } = useParams();
  const isPredecessor = me.role === 'predecessor';

  // 새 답변 입력과, 수정 중인 답변(가장 최근 답변)의 입력은 따로 둔다
  const [answer, setAnswer] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const answers = detail?.answers ?? [];
  const latestAnswer = answers[answers.length - 1];
  const canSubmit = answer.trim().length > 0 && !submitting;
  const canSaveEdit = editText.trim().length > 0 && !submitting;

  const run = async (request) => {
    setSubmitting(true);
    try {
      await request();
      onChanged();
    } finally {
      setSubmitting(false);
    }
  };

  // 답변 등록은 질문 버전(revision)을 함께 보낸다. 그 사이 질문이 수정됐으면 서버가 거절한다.
  const submitAnswer = () => {
    if (!canSubmit) return;
    run(async () => {
      await createReply(projectId, threadId, answer.trim(), detail.revision);
      setAnswer('');
    });
  };

  const saveEdit = () => {
    if (!canSaveEdit) return;
    run(async () => {
      await updateReply(projectId, threadId, editingId, editText.trim());
      setEditingId(null);
    });
  };

  const startEditAnswer = () => {
    setEditText(latestAnswer.content);
    setEditingId(latestAnswer.replyId);
  };

  const cancelEditAnswer = () => setEditingId(null);

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
    } else if (editingId !== null) {
      footer = (
        <div className={styles.footerGroup}>
          <Button text="취소" variant="white" className={styles.footerButton} onClick={cancelEditAnswer} />
          <Button
            text="수정 완료"
            variant={canSaveEdit ? 'primary' : 'deactivate'}
            className={styles.footerButton}
            onClick={saveEdit}
          />
        </div>
      );
    } else {
      // 전임자: 답변이 있어도 추가 답변을 달 수 있다. 수정은 가장 최근 답변만
      footer = (
        <div className={styles.footerGroup}>
          {latestAnswer && REPLY_EDIT_SUPPORTED && (
            <Button text="답변 수정" variant="white" className={styles.footerButton} onClick={startEditAnswer} />
          )}
          <Button
            text="답변 등록"
            variant={canSubmit ? 'primary' : 'deactivate'}
            className={styles.footerButton}
            onClick={submitAnswer}
          />
        </div>
      );
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
          {error && <p className={styles.sideLabel}>질문을 불러오지 못했어요.</p>}
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

                    {/* 답변은 등록순으로 모두 보여 준다 */}
                    {answers.map((reply) => (
                      <ThreadMessage
                        key={reply.replyId}
                        role="predecessor"
                        authorName={reply.authorName}
                        createdAt={reply.createdAt}
                      >
                        {editingId === reply.replyId ? (
                          <textarea
                            className={`${styles.bubble} ${styles.bubbleAnswer} ${styles.bubbleInput}`}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            aria-label="답변 수정"
                            autoFocus
                          />
                        ) : (
                          <p className={`${styles.bubble} ${styles.bubbleAnswer}`}>{reply.content}</p>
                        )}
                      </ThreadMessage>
                    ))}
                  </div>
                </div>

                {/* 가장 최근 답변이 반영된 인수인계서 안내 (서버 제공 값) */}
                {latestAnswer?.reflection && (
                  <p className={styles.reflection}>
                    <img src={CheckIcon} alt="" />
                    이 답변은 인수인계서 {latestAnswer.reflection.version} '{latestAnswer.reflection.topicId}.{' '}
                    {latestAnswer.reflection.topicName}'에 반영되었고, 완성도 점수(질문 해결률)에 포함됐어요.
                  </p>
                )}

                {/* 전임자: 답변 입력 (답변이 있으면 추가 답변). 답변을 수정하는 동안은 숨긴다 */}
                {isPredecessor && editingId === null && (
                  <>
                    <hr className={styles.divider} />
                    <div className={styles.answer}>
                      <label htmlFor="qna-answer" className={styles.answerLabel}>
                        {answers.length ? '추가 답변 하기' : '답변 하기'}
                      </label>
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

              {footer}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default QnADetail;
