import axiosClient from './axiosClient';
import { getProjectInfo } from './project';
import {
  mockRole,
  mockTeamName,
  mockTopics,
  mockQuestionList,
  mockSuccessorName,
  createMockAnswer,
} from './mock-data';

// Q&A API. 백엔드(SWU-likelion-BE qa 모듈) 응답을 화면이 쓰는 모양으로 바꿔서 돌려준다.
// 화면(pages/QnA*.jsx)은 아래 "반환" 모양만 알면 되고, 서버 필드 이름은 이 파일 안에서만 다룬다.
// (axiosClient는 응답의 { data }를 언랩해서 반환하므로 .data를 다시 꺼내지 않는다.)

// 백엔드 연결 전에는 true → 목업 데이터로 화면 확인
// 지금 백엔드 Q&A는 인수인계서(문서) 모듈이 연결돼야 질문을 등록·조회할 수 있다. 연결되면 false로 바꾼다.
export const USE_MOCK = true;

// 답변 수정 API가 백엔드에 없다. 없는 동안 실제 서버 모드에서는 '답변 수정' 버튼을 숨긴다.
export const REPLY_EDIT_SUPPORTED = USE_MOCK;

const mockResponse = (data) => Promise.resolve(data);
const notFound = () => Promise.reject(new Error('RESOURCE_NOT_FOUND'));
const findQuestion = (threadId) => mockQuestionList.find((q) => q.threadId === Number(threadId));

// 첨부: 서버는 업로드한 파일의 주소(url)를 내려준다고 가정한다.
// mock에서는 브라우저 임시 주소(createObjectURL)로 대신하며, 새로고침하면 사라진다.
let nextAttachmentId = 100;
const toMockAttachments = (files) =>
  files.map((f) => ({
    id: nextAttachmentId++,
    name: f.name,
    size: f.size,
    contentType: f.type,
    url: URL.createObjectURL(f),
  }));

// ---------- 표기 · 유틸 ----------

export const ROLE_LABEL = { predecessor: '전임자', successor: '후임자' };
export const STATUS_LABEL = { unresolved: '미해결', resolved: '해결됨' };
export const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
];
export const CONTENT_MAX_LENGTH = 1000;

// '관련 항목' 표기: '3. 주요 업무 절차'. 서버가 항목 이름을 주지 않으면 '-'
export const topicLabel = ({ topicId, topicName }) => (topicName ? `${topicId}. ${topicName}` : '-');

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// 서버가 준 등록 일시 → '방금' / 'N분 전' / 'N시간 전' / 'N일 전'
export const formatRelativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE_MS) return '방금';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}분 전`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}시간 전`;
  return `${Math.floor(diff / DAY_MS)}일 전`;
};

// ---------- 서버 응답 → 화면 모양 ----------

const SERVER_STATUS = { OPEN: 'unresolved', RESOLVED: 'resolved' };

// 서버에 질문 제목이 없어서, 제목이 없으면 내용 첫 줄을 제목으로 보여 준다.
const firstLine = (text = '') => text.split('\n')[0];

// 질문: { threadId, projectId, versionId, sectionId, authorId, content, status, revision, replyCount, createdAt, updatedAt }
// 작성자 이름이 없어서 질문은 후임자, 답변은 전임자 이름(인수인계 참여자)으로 채운다.
const normalizeQuestion = (raw, names = {}) => ({
  threadId: raw.threadId,
  status: SERVER_STATUS[raw.status] ?? 'unresolved',
  title: raw.title ?? firstLine(raw.content),
  content: raw.content,
  topicId: raw.sectionId, // 관련 항목 = 인수인계서 섹션
  topicName: raw.sectionTitle ?? '', // 서버에 없음
  authorName: raw.authorName ?? names.successor ?? '',
  createdAt: raw.createdAt,
  revision: raw.revision, // 수정·답변 요청에 함께 보내야 하는 질문 버전
  attachments: raw.attachments ?? [], // 서버에 없음
});

// 답변: { replyId, authorId, content, questionRevision, questionContent, createdAt }
// 서버는 답변을 여러 개 받을 수 있지만 화면은 답변 하나만 보여 준다 → 가장 최근 답변
const normalizeAnswer = (replies, names = {}) => {
  const latest = replies[replies.length - 1];
  if (!latest) return null;
  return {
    authorName: latest.authorName ?? names.predecessor ?? '',
    content: latest.content,
    createdAt: latest.createdAt,
    reflection: latest.reflection ?? null, // 인수인계서 반영 안내. 서버에 없음
  };
};

const sortQuestions = (list, sort) =>
  [...list].sort((a, b) =>
    sort === 'oldest'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt),
  );

// 참여자 이름은 장식이라, 조회에 실패해도 Q&A 화면은 그대로 보여 준다.
const getNames = (projectId) =>
  getProjectInfo(projectId)
    .then((info) => info.names)
    .catch(() => ({}));

// ---------- 조회 ----------

// 이 인수인계에서 내 역할과 팀 이름
// GET /handovers/{projectId} → myRoles, roleName
// 반환: { role: 'predecessor' | 'successor', teamName }
export async function getMyRole(projectId) {
  if (USE_MOCK) return { role: mockRole, teamName: mockTeamName };
  const { role, teamName } = await getProjectInfo(projectId);
  return { role, teamName };
}

// 관련 항목(인수인계서 섹션) 목록
// TODO: 서버에 질문할 수 있는 섹션 목록 API가 없어서 실제 서버 모드에서도 mock을 쓴다.
// 반환: [{ topicId, topicName }]
export function getTopics(projectId) {
  return mockResponse(Object.entries(mockTopics).map(([id, name]) => ({ topicId: Number(id), topicName: name })));
}

// 질문 목록 조회
// GET /handovers/{projectId}/questions?page=0&size=100 (서버는 최신순만 지원 → 오래된순은 여기서 정렬)
// 반환: [{ threadId, status, title, content, topicId, topicName, authorName, createdAt }]
export async function getQuestionList(projectId, { sort = 'latest' } = {}) {
  if (USE_MOCK) return sortQuestions(mockQuestionList, sort);
  const [page, names] = await Promise.all([
    axiosClient.get(`/handovers/${projectId}/questions`, { params: { page: 0, size: 100 } }),
    getNames(projectId),
  ]);
  return sortQuestions((page?.items ?? []).map((q) => normalizeQuestion(q, names)), sort);
}

// 질문과 답변 상세 조회
// GET /handovers/{projectId}/questions/{threadId} → { question, replies }
// 반환: { threadId, status, title, content, topicId, topicName, authorName, createdAt, revision,
//        attachments: [{ id, name, size, contentType, url }],
//        document: { topicId, topicName, excerpt } | null,        // 질문한 인수인계서 원문
//        answer: { authorName, content, createdAt, reflection: { version, topicId, topicName } | null } | null }
export async function getQuestionDetail(projectId, threadId) {
  if (USE_MOCK) {
    const question = findQuestion(threadId);
    if (!question) return notFound();
    return {
      ...question,
      revision: 1,
      // 질문자가 참조한 인수인계서 원문. 인수인계서가 아직 없어서 예시 문구로 둔다.
      document: { topicId: question.topicId, topicName: question.topicName, excerpt: '인수인계서 원문 예시' },
    };
  }
  const [raw, names] = await Promise.all([
    axiosClient.get(`/handovers/${projectId}/questions/${threadId}`),
    getNames(projectId),
  ]);
  const question = normalizeQuestion(raw.question, names);
  return {
    ...question,
    // 서버에 원문 발췌가 없다. 받으면 { topicId, topicName, excerpt }로 채운다.
    document: raw.question.sectionExcerpt
      ? { topicId: question.topicId, topicName: question.topicName, excerpt: raw.question.sectionExcerpt }
      : null,
    answer: normalizeAnswer(raw.replies ?? [], names),
  };
}

// ---------- 질문 (후임자) ----------

// 문서 항목에 질문 등록
// POST /handovers/{projectId}/questions
// 요청: { sectionId, title, content } (서버는 아직 title과 첨부를 받지 않는다)
// 반환: { threadId }
export async function createQuestion(projectId, { topicId, title, content, files = [] }) {
  if (USE_MOCK) {
    const threadId = Math.max(0, ...mockQuestionList.map((q) => q.threadId)) + 1;
    mockQuestionList.push({
      threadId,
      status: 'unresolved',
      title,
      content,
      topicId,
      topicName: mockTopics[topicId],
      authorName: mockSuccessorName,
      createdAt: new Date().toISOString(),
      attachments: toMockAttachments(files),
      answer: null,
    });
    return { threadId };
  }
  const created = await axiosClient.post(`/handovers/${projectId}/questions`, { sectionId: topicId, title, content });
  return { threadId: created.threadId };
}

// 후임자가 발송한 질문 수정. revision은 상세 조회에서 받은 질문 버전 (다르면 서버가 409)
// PATCH /handovers/{projectId}/questions/{threadId}
// 요청: { revision, title, content } (서버는 관련 항목 변경과 첨부를 받지 않는다)
export async function updateQuestion(projectId, threadId, { revision, topicId, title, content, files = [], attachments = [] }) {
  if (USE_MOCK) {
    const question = findQuestion(threadId);
    if (!question) return notFound();
    Object.assign(question, {
      topicId,
      topicName: mockTopics[topicId],
      title,
      content,
      attachments: [...attachments, ...toMockAttachments(files)],
    });
    return null;
  }
  await axiosClient.patch(`/handovers/${projectId}/questions/${threadId}`, { revision, title, content });
  return null;
}

// ---------- 답변 (전임자) ----------

// 질문에 답변 등록 → 서버가 질문을 해결됨으로 바꾼다
// POST /handovers/{projectId}/questions/{threadId}/replies
// 요청: { questionRevision, content } (questionRevision: 답변하는 질문의 버전. 그 사이 질문이 수정됐으면 409)
export async function createReply(projectId, threadId, content, questionRevision) {
  if (USE_MOCK) {
    const question = findQuestion(threadId);
    if (!question) return notFound();
    question.answer = { ...createMockAnswer(question.topicId, Date.now()), content };
    question.status = 'resolved';
    return null;
  }
  await axiosClient.post(`/handovers/${projectId}/questions/${threadId}/replies`, { questionRevision, content });
  return null;
}

// 답변 수정. 백엔드에 API가 없어 mock으로만 동작한다. (REPLY_EDIT_SUPPORTED)
export function updateReply(projectId, threadId, content) {
  const question = findQuestion(threadId);
  if (!question?.answer) return notFound();
  question.answer = { ...question.answer, content };
  return mockResponse(null);
}
