// 백엔드 연동 전 임시 데이터. API 연동 시 이 파일의 값을 서버 응답으로 교체한다.

// 로그인한 사용자의 역할. 화면 확인용으로 값을 바꿔 가며 쓴다.
// 'predecessor'(전임자) | 'successor'(후임자)
export const mockRole = 'successor';

// 영역(topic). id는 서버가 정한다.
export const mockTopics = {
  1: '예외 상황 및 유의사항',
  2: '사용 도구 및 계정',
  3: '주요 업무 절차',
  4: '거래처 및 협력처',
  5: '업무 개요 · 참고 자료',
};

// 퀴즈 세트 목록
export const mockQuizList = [
  { id: 1, title: '인수인계 퀴즈 1', questionCount: 10, passingScore: 80 },
];

const OPTIONS = ['보기 1', '보기 2', '보기 3', '보기 4'];

// 퀴즈 세트. 문제 정의는 풀이(QuizSession)와 해설(QuizExplanation)이 함께 사용한다.
// teamName은 비워두고, passingScore는 선임자가 슬라이더로 설정한 통과 기준 값이 내려오도록 연결한다.
// topicId는 문제가 속한 영역의 id이며, 영역 이름은 mockTopics에서 id로 찾는다.
export const mockQuizSet = {
  teamName: '',
  passingScore: 80,
  questions: [
    { id: 1, type: 'choice', category: '상황형', topicId: 5, text: '질문 1', options: OPTIONS },
    { id: 2, type: 'choice', category: '상황형', topicId: 3, text: '질문 2', options: OPTIONS },
    { id: 3, type: 'choice', category: '상황형', topicId: 1, text: '질문 3', options: OPTIONS },
    { id: 4, type: 'choice', category: '상황형', topicId: 3, text: '질문 4', options: OPTIONS },
    { id: 5, type: 'choice', category: '상황형', topicId: 4, text: '질문 5', options: OPTIONS },
    { id: 6, type: 'choice', category: '상황형', topicId: 1, text: '질문 6', options: OPTIONS },
    { id: 7, type: 'choice', category: '상황형', topicId: 2, text: '질문 7', options: OPTIONS },
    { id: 8, type: 'short', category: '지식형', topicId: 4, text: '질문 8' },
    { id: 9, type: 'short', category: '지식형', topicId: 1, text: '질문 9' },
    { id: 10, type: 'short', category: '지식형', topicId: 5, text: '질문 10' },
  ],
};

// 채점 후 문항별 결과. 맞고 틀린 결과는 서버가 내려주는 값이라 지금은 예시다.
// (3, 6, 7번이 오답) 해설(QuizExplanation)과 채점 결과(QuizResult)가 함께 사용한다.
// 객관식: answerIndex(정답 보기)와 myIndex(내가 고른 보기)가 같으면 정답
// 단답형: correct로 정답 여부를 직접 내려준다
const rawGrading = {
  1: { answerIndex: 0, myIndex: 0 },
  2: { answerIndex: 1, myIndex: 1 },
  3: { answerIndex: 1, myIndex: 3 },
  4: { answerIndex: 2, myIndex: 2 },
  5: { answerIndex: 3, myIndex: 3 },
  6: { answerIndex: 0, myIndex: 1 },
  7: { answerIndex: 1, myIndex: 2 },
  8: { correct: true },
  9: { correct: true },
  10: { correct: true },
};

// 모든 문항에 correct를 채워서 내려준다. API 연동 후에는 서버 응답이 이 형태가 되도록 맞춘다.
export const mockQuizGrading = Object.fromEntries(
  Object.entries(rawGrading).map(([id, g]) => [
    id,
    {
      ...g,
      correct: g.correct ?? g.answerIndex === g.myIndex,
      explanation: '해설 예시',
      aiEvaluation: 'AI 평가 : 예시',
    },
  ]),
);

// 응시 정보. submittedAt, retakeAt은 서버가 내려주는 ISO 시각이다.
// 재응시 가능일은 서버가 정하므로 프론트에서 제출 시각 + N일로 계산하지 않는다.
// retakeAt이 null이면(통과 등 재응시 불필요) 재응시 영역을 숨긴다.
const DAY_MS = 24 * 60 * 60 * 1000;
export const mockQuizAttempt = {
  attemptId: 1,
  attempt: 1, // n회차
  submittedAt: new Date().toISOString(), // mock: 지금 제출
  retakeAt: new Date(Date.now() + 3 * DAY_MS).toISOString(), // mock: 3일 뒤
};

// 취약 영역 분석. 영역별 문항 수(total)는 AI가 문제를 만들 때 정해지는 값이라 서버가 내려준다.
// 영역의 표시 순서도 서버가 정한다. mock은 영역 id 순서(1~5)를 쓰고, 값은 위 문제/채점 mock에서 계산한다.
export const mockQuizWeakAreas = Object.keys(mockTopics).map((key) => {
  const topicId = Number(key);
  const group = mockQuizSet.questions.filter((q) => q.topicId === topicId);
  return {
    topicId,
    topicName: mockTopics[topicId],
    correct: group.filter((q) => mockQuizGrading[q.id].correct).length,
    total: group.length,
  };
});

// 팀 이름. 인수인계 프로젝트 정보에서 서버가 내려준다 (예시 값)
export const mockTeamName = '팀 이름 예시';

export const mockPredecessorName = '김철수';
export const mockSuccessorName = '홍길동';

// 질문 목록 저장소. 등록·수정·답변 mock이 이 배열을 직접 바꾼다.
// status: 'unresolved'(미해결) | 'resolved'(해결됨)
// 제목·설명·작성자는 예시 값이고, createdAt(등록 일시)은 서버가 내려준다.
const HOUR_MS = 60 * 60 * 1000;
const qnaNow = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const mockAnswer = (topicId, ms) => ({
  authorName: mockPredecessorName,
  content: '답변 예시',
  createdAt: iso(ms),
  // 답변이 반영된 인수인계서 정보 (서버 제공)
  reflection: { version: 'v1.2', topicId, topicName: mockTopics[topicId] },
});
const mockQuestion = (threadId, topicId, ms, answered) => ({
  threadId,
  status: answered ? 'resolved' : 'unresolved',
  title: '제목',
  content: '설명',
  topicId,
  topicName: mockTopics[topicId],
  authorName: mockSuccessorName,
  createdAt: iso(ms),
  attachments: [],
  answer: answered ? mockAnswer(topicId, ms + HOUR_MS) : null,
});

export const mockQuestionList = [
  mockQuestion(1, 3, qnaNow, false),
  mockQuestion(2, 4, qnaNow - 3 * HOUR_MS, false),
  mockQuestion(3, 5, qnaNow - 12 * HOUR_MS, true),
  mockQuestion(4, 2, qnaNow - 24 * HOUR_MS, true),
];

export const createMockAnswer = mockAnswer;
