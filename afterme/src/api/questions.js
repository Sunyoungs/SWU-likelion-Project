import { mockQuestionList } from './mock-data';

// Q&A API. 지금은 mock 데이터를 Promise로 돌려주며, 백엔드 연동 시 함수 본문만
// axiosClient 호출로 교체한다. (axiosClient는 응답을 언랩해서 반환하므로 .data를 다시 꺼내지 않는다.)
// 엔드포인트는 API 명세서 기준이고, 요청/응답 필드는 상세 스키마가 확인되면 맞춘다.

const mockResponse = (data) => Promise.resolve(data);

// 정렬 기준
export const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
];

// 질문 상태 표기
export const STATUS_LABEL = { unresolved: '미해결', resolved: '해결됨' };

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
