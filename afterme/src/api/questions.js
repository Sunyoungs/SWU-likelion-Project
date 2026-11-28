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

// 질문 수정 API가 관련 항목 변경을 받지 않는다. 실제 서버 모드에서는 수정 화면의 관련 항목을 바꿀 수 없게 한다.
export const TOPIC_EDIT_SUPPORTED = USE_MOCK;

const mockResponse = (data) => Promise.resolve(data);
const notFound = () => Promise.reject(new Error('RESOURCE_NOT_FOUND'));
const findQuestion = (threadId) => mockQuestionList.find((q) => q.threadId === Number(threadId));

// 첨부: 서버가 내려주는 url은 토큰이 있어야 받을 수 있는 다운로드 주소다 (openAttachment로 연다).
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

// '관련 항목' 표기: '3. 주요 업무 절차'. 번호는 인수인계서 안 순서(topicOrder), 없으면 id.
// 서버가 항목 이름을 주지 않으면 '-'
export const topicLabel = ({ topicId, topicOrder, topicName }) =>
  topicName ? `${topicOrder ?? topicId}. ${topicName}` : '-';

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

// 질문: { threadId, sectionId, sectionTitle, sectionDisplayOrder, title, content, status, revision,
//        authorName, createdAt, ... }
// 작성자 이름이 비어 있으면 질문은 후임자, 답변은 전임자 이름(인수인계 참여자)으로 채운다.
const normalizeQuestion = (raw, names = {}) => ({
  threadId: raw.threadId,
  status: SERVER_STATUS[raw.status] ?? 'unresolved',
  title: raw.title || firstLine(raw.content), // 제목 없이 등록된 예전 질문은 내용 첫 줄
  content: raw.content,
  topicId: raw.sectionId, // 관련 항목 = 인수인계서 섹션
  topicOrder: raw.sectionDisplayOrder ?? null,
  topicName: raw.sectionTitle ?? '',
  authorName: raw.authorName ?? names.successor ?? '',
  createdAt: raw.createdAt,
  revision: raw.revision, // 수정·답변 요청에 함께 보내야 하는 질문 버전
  attachments: [], // 첨부는 상세 조회에서만 온다
});

// 첨부: { attachmentId, fileName, contentType, sizeBytes, downloadUrl }
const normalizeAttachment = (a) => ({
  id: a.attachmentId,
  name: a.fileName,
  size: a.sizeBytes,
  contentType: a.contentType,
  url: a.downloadUrl,
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

// 질문할 수 있는 관련 항목(공개된 인수인계서 섹션) 목록
// GET /handovers/{projectId}/questions/sections → [{ sectionId, versionId, taskId, title, displayOrder }]
// 반환: [{ topicId, topicOrder, topicName }] (인수인계서 순서대로)
export async function getTopics(projectId) {
  if (USE_MOCK) {
    return Object.entries(mockTopics).map(([id, name]) => ({ topicId: Number(id), topicOrder: Number(id), topicName: name }));
  }
  const sections = await axiosClient.get(`/handovers/${projectId}/questions/sections`);
  return [...(sections ?? [])]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((s) => ({ topicId: s.sectionId, topicOrder: s.displayOrder ?? null, topicName: s.title }));
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
// GET /handovers/{projectId}/questions/{threadId} → { question, replies, attachments, sectionContent }
// 반환: { threadId, status, title, content, topicId, topicOrder, topicName, authorName, createdAt, revision,
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
  const { topicId, topicOrder, topicName } = question;
  return {
    ...question,
    attachments: (raw.attachments ?? []).map(normalizeAttachment),
    // 질문한 섹션의 인수인계서 원문. 서버가 주지 않으면 원문 영역을 숨긴다.
    document: raw.sectionContent ? { topicId, topicOrder, topicName, excerpt: raw.sectionContent } : null,
    answer: normalizeAnswer(raw.replies ?? [], names),
  };
}

// ---------- 첨부 ----------

// 첨부 파일을 하나씩 올린다. 질문은 이미 저장된 뒤라, 일부가 실패해도 나머지는 올리고 실패한 파일 이름만 돌려준다.
// POST /handovers/{projectId}/questions/{threadId}/attachments (multipart, file)
// 서버 규칙: 질문 작성자(후임자)만, 10MB 이하, PDF·PNG·JPG·GIF만
async function uploadAttachments(projectId, threadId, files) {
  const results = await Promise.allSettled(
    files.map((file) => {
      const form = new FormData();
      form.append('file', file);
      return axiosClient.post(`/handovers/${projectId}/questions/${threadId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipErrorAlert: true,
      });
    }),
  );
  return files.filter((_, i) => results[i].status === 'rejected').map((f) => f.name);
}

// 첨부 삭제. 실패한 파일 이름만 돌려준다.
// DELETE /handovers/{projectId}/questions/{threadId}/attachments/{attachmentId}
async function deleteAttachments(projectId, threadId, attachments) {
  const results = await Promise.allSettled(
    attachments.map((a) =>
      axiosClient.delete(`/handovers/${projectId}/questions/${threadId}/attachments/${a.id}`, { skipErrorAlert: true }),
    ),
  );
  return attachments.filter((_, i) => results[i].status === 'rejected').map((a) => a.name);
}

// 첨부 열기. 다운로드 주소는 토큰이 있어야 받을 수 있어서, 파일을 받아 브라우저 임시 주소로 새 탭에 연다.
// 팝업 차단을 피하려고 클릭하는 순간 새 탭을 먼저 연 뒤, 파일이 오면 그 탭에 띄운다.
// GET /handovers/{projectId}/questions/{threadId}/attachments/{attachmentId}
export async function openAttachment(file) {
  if (file.url?.startsWith('blob:')) {
    window.open(file.url, '_blank', 'noopener');
    return;
  }
  const tab = window.open('', '_blank');
  try {
    // 서버 주소는 /api로 시작하고, axiosClient가 /api를 앞에 붙이므로 뺀다
    const blob = await axiosClient.get(file.url.replace(/^\/api/, ''), { responseType: 'blob', skipErrorAlert: true });
    const url = URL.createObjectURL(new Blob([blob], { type: file.contentType || blob.type }));
    if (tab) tab.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}

// ---------- 질문 (후임자) ----------

// 문서 항목에 질문 등록 후 첨부 업로드
// POST /handovers/{projectId}/questions
// 요청: { sectionId, title, content }
// 반환: { threadId, failedFiles } (failedFiles: 올리지 못한 첨부 이름. 질문은 등록된 상태)
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
    return { threadId, failedFiles: [] };
  }
  const created = await axiosClient.post(
    `/handovers/${projectId}/questions`,
    { sectionId: topicId, title, content },
    { skipErrorAlert: true },
  );
  const failedFiles = await uploadAttachments(projectId, created.threadId, files);
  return { threadId: created.threadId, failedFiles };
}

// 후임자가 발송한 질문 수정 후 첨부 정리. revision은 상세 조회에서 받은 질문 버전 (다르면 서버가 409)
// PATCH /handovers/{projectId}/questions/{threadId}
// 요청: { revision, title, content } (서버는 관련 항목 변경을 받지 않는다)
// attachments: 남겨 둘 기존 첨부, originalAttachments: 수정 전 첨부 → 빠진 것은 삭제, files는 새로 업로드
// 반환: { failedFiles, failedRemovals } (실패한 첨부 이름. 질문 내용은 수정된 상태)
export async function updateQuestion(
  projectId,
  threadId,
  { revision, topicId, title, content, files = [], attachments = [], originalAttachments = [] },
) {
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
    return { failedFiles: [], failedRemovals: [] };
  }
  await axiosClient.patch(
    `/handovers/${projectId}/questions/${threadId}`,
    { revision, title, content },
    { skipErrorAlert: true },
  );
  const keptIds = new Set(attachments.map((a) => a.id));
  const removed = originalAttachments.filter((a) => !keptIds.has(a.id));
  const [failedRemovals, failedFiles] = await Promise.all([
    deleteAttachments(projectId, threadId, removed),
    uploadAttachments(projectId, threadId, files),
  ]);
  return { failedFiles, failedRemovals };
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
  await axiosClient.post(
    `/handovers/${projectId}/questions/${threadId}/replies`,
    { questionRevision, content },
    { skipErrorAlert: true },
  );
  return null;
}

// 답변 수정. 백엔드에 API가 없어 mock으로만 동작한다. (REPLY_EDIT_SUPPORTED)
export function updateReply(projectId, threadId, content) {
  const question = findQuestion(threadId);
  if (!question?.answer) return notFound();
  question.answer = { ...question.answer, content };
  return mockResponse(null);
}
