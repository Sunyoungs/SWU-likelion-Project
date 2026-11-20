import { mockQuizList, mockQuizSet, mockQuizGrading, mockQuizAttempt, mockQuizWeakAreas, mockTopics } from './mock-data';

// 퀴즈 API. 지금은 mock 데이터를 Promise로 돌려주며, 백엔드 연동 시 각 함수 본문만
// axiosClient 호출로 교체한다. (axiosClient는 응답을 언랩해서 반환하므로 .data를 다시 꺼내지 않는다.)
// 엔드포인트는 API 명세서 기준이다. 요청/응답 필드는 명세서에 상세 스키마가 확인되면 맞춘다.
//
// 흐름: 목록 조회 → 응시 시작(attemptId 발급) → 응시 문항 조회 → 답안 제출 → 결과 및 해설 조회

const mockResponse = (data) => Promise.resolve(data);

// 문제 유형 표기. 서버의 type 값('choice' | 'short')에 대응한다.
export const TYPE_LABEL = { choice: '객관식', short: '단답형' };

// 퀴즈 목록 조회
// GET /handovers/{projectId}/quizzes
// 응답: [{ id, title, questionCount, passingScore }]
export function getQuizList(projectId) {
  return mockResponse(mockQuizList);
}

// 퀴즈 응시 시작. 응시(attempt)를 만들고 attemptId를 발급한다.
// POST /handovers/{projectId}/quizzes/{quizSetId}/attempts
// 응답: { attemptId }
export function startAttempt(projectId, quizSetId) {
  return mockResponse({ attemptId: mockQuizAttempt.attemptId });
}

// 응시 문항 조회. 정답과 해설은 포함하지 않는다.
// GET /handovers/{projectId}/quizzes/{quizSetId}/attempts/{attemptId}
// 응답: { teamName, passingScore, questions: [{ id, type, category, topicId, text, options? }] }
export function getAttemptQuestions(projectId, quizSetId, attemptId) {
  return mockResponse(mockQuizSet);
}

// 퀴즈 답안 제출. answers는 { [questionId]: 선택한 보기 index | 입력한 텍스트 }
// POST /handovers/{projectId}/quizzes/{quizSetId}/attempts/{attemptId}/submission
// 응답: 명세서 확인 필요 (결과는 getAttemptResult로 따로 조회한다)
export function submitAttempt(projectId, quizSetId, attemptId, answers) {
  return mockResponse(null);
}

// 퀴즈 결과 및 해설 조회. 채점 결과 화면과 해설 화면이 같은 응답을 쓴다.
// GET /handovers/{projectId}/quizzes/{quizSetId}/attempts/{attemptId}/result
// 응답: {
//   teamName, passingScore, attempt, submittedAt, retakeAt,
//   items: [{ questionId, type, topicId, topicName, correct, aiEvaluation }],   // 채점 결과 표
//   questions: [...getAttemptQuestions의 questions],                             // 해설: 문제 정의
//   grading: { [questionId]: { correct, answerIndex?, myIndex?, explanation } }, // 해설: 문항별 채점
//   weakAreas: [{ topicId, topicName, correct, total }],                         // 해설: 취약 영역 분석
// }
// - submittedAt, retakeAt은 서버가 내려주는 ISO 시각이며, retakeAt이 null이면 재응시 영역을 숨긴다.
// - weakAreas의 순서와 영역별 문항 수(total)는 서버가 정해서 내려준다. (프론트에서 계산하지 않는다)
// - 문제의 topicId와 weakAreas, items의 topicId는 같은 영역 id이다.
export function getAttemptResult(projectId, quizSetId, attemptId) {
  const { teamName, passingScore, questions } = mockQuizSet;
  const { attempt, submittedAt, retakeAt } = mockQuizAttempt;
  return mockResponse({
    teamName,
    passingScore,
    attempt,
    submittedAt,
    retakeAt,
    items: questions.map((q) => ({
      questionId: q.id,
      type: q.type,
      topicId: q.topicId,
      topicName: mockTopics[q.topicId],
      correct: mockQuizGrading[q.id].correct,
      aiEvaluation: mockQuizGrading[q.id].aiEvaluation,
    })),
    questions,
    grading: mockQuizGrading,
    weakAreas: mockQuizWeakAreas,
  });
}
