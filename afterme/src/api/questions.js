import {
  mockRole,
  mockTeamName,
  mockTopics,
  mockQuestionList,
  mockSuccessorName,
  createMockAnswer,
} from './mock-data';

// Q&A API. 지금은 mock 데이터를 Promise로 돌려주며, 백엔드 연동 시 함수 본문만
// axiosClient 호출로 교체한다. (axiosClient는 응답을 언랩해서 반환하므로 .data를 다시 꺼내지 않는다.)
// 엔드포인트는 API 명세서 기준이고, 요청/응답 필드는 상세 스키마가 확인되면 맞춘다.

const mockResponse = (data) => Promise.resolve(data);
const notFound = () => Promise.reject(new Error('RESOURCE_NOT_FOUND'));
const findQuestion = (threadId) => mockQuestionList.find((q) => q.threadId === Number(threadId));

// ---------- 표기 · 유틸 ----------

export const ROLE_LABEL = { predecessor: '전임자', successor: '후임자' };
export const STATUS_LABEL = { unresolved: '미해결', resolved: '해결됨' };
export const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
];
export const CONTENT_MAX_LENGTH = 1000;

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

// ---------- 조회 ----------

// 이 인수인계에서 내 역할과 팀 이름
// TODO: 명세서에 맞는 엔드포인트 확인 (프로젝트 멤버/상세 조회 응답에 포함될 것으로 예상)
// 응답: { role: 'predecessor' | 'successor', teamName }
export function getMyRole(projectId) {
  return mockResponse({ role: mockRole, teamName: mockTeamName });
}

// 관련 항목(인수인계서 영역) 목록
// TODO: 인수인계서 템플릿 조회 API가 정해지면 교체
// 응답: [{ topicId, topicName }]
export function getTopics(projectId) {
  return mockResponse(Object.entries(mockTopics).map(([id, name]) => ({ topicId: Number(id), topicName: name })));
}

// 질문 목록 조회
// GET /handovers/{projectId}/questions?sort=latest|oldest
// 응답: [{ threadId, status, title, content, topicId, topicName, authorName, createdAt }]
export function getQuestionList(projectId, { sort = 'latest' } = {}) {
  // TODO: return axiosClient.get(`/handovers/${projectId}/questions`, { params: { sort } });
  const sorted = [...mockQuestionList].sort((a, b) =>
    sort === 'oldest'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt),
  );
  return mockResponse(sorted);
}

// 질문과 답변 상세 조회
// GET /handovers/{projectId}/questions/{threadId}
// 응답: { threadId, status, title, content, topicId, topicName, authorName, createdAt, attachments,
//        document: { topicId, topicName, excerpt },
//        answer: { authorName, content, createdAt, reflection: { version, topicId, topicName } } | null }
export function getQuestionDetail(projectId, threadId) {
  // TODO: return axiosClient.get(`/handovers/${projectId}/questions/${threadId}`);
  const question = findQuestion(threadId);
  if (!question) return notFound();
  return mockResponse({
    ...question,
    // 질문자가 참조한 인수인계서 원문. 인수인계서가 아직 없어서 예시 문구로 둔다.
    document: { topicId: question.topicId, topicName: question.topicName, excerpt: '인수인계서 원문 예시' },
  });
}

// ---------- 질문 (후임자) ----------

// 문서 항목에 질문 등록
// POST /handovers/{projectId}/questions
// 요청: { topicId, title, content, files } (파일은 multipart로 함께 보낸다고 가정)
// 응답: { threadId }
export function createQuestion(projectId, { topicId, title, content, files = [] }) {
  // TODO: axiosClient.post(`/handovers/${projectId}/questions`, formData)
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
    attachments: files.map((f) => ({ name: f.name, size: f.size })),
    answer: null,
  });
  return mockResponse({ threadId });
}

// 후임자가 발송한 질문 수정
// PATCH /handovers/{projectId}/questions/{threadId}
// 요청: { topicId, title, content, files, attachments(유지할 기존 첨부) }
export function updateQuestion(projectId, threadId, { topicId, title, content, files = [], attachments = [] }) {
  // TODO: axiosClient.patch(`/handovers/${projectId}/questions/${threadId}`, formData)
  const question = findQuestion(threadId);
  if (!question) return notFound();
  Object.assign(question, {
    topicId,
    topicName: mockTopics[topicId],
    title,
    content,
    attachments: [...attachments, ...files.map((f) => ({ name: f.name, size: f.size }))],
  });
  return mockResponse(null);
}

// ---------- 답변 (전임자) ----------

// 질문에 답변 등록 → 질문은 해결됨으로 바뀐다
// POST /handovers/{projectId}/questions/{threadId}/replies
// 요청: { content }
export function createReply(projectId, threadId, content) {
  // TODO: return axiosClient.post(`/handovers/${projectId}/questions/${threadId}/replies`, { content });
  const question = findQuestion(threadId);
  if (!question) return notFound();
  question.answer = { ...createMockAnswer(question.topicId, Date.now()), content };
  question.status = 'resolved';
  return mockResponse(null);
}

// 답변 수정
// TODO: API 명세서에 답변 수정 엔드포인트가 없음. 백엔드와 확인 필요 (mock으로만 동작)
export function updateReply(projectId, threadId, content) {
  const question = findQuestion(threadId);
  if (!question?.answer) return notFound();
  question.answer = { ...question.answer, content };
  return mockResponse(null);
}
