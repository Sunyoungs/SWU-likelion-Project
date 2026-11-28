import axiosClient from './axiosClient';
import { mockQuizPage, mockQuizSet, mockQuizGrading, mockQuizAttempt, mockQuizWeakAreas, mockTopics } from './mock-data';

// 퀴즈 API. 백엔드(SWU-likelion-BE quiz 모듈) 응답을 화면이 쓰는 모양으로 바꿔서 돌려준다.
// 화면(pages/Quiz*.jsx)은 아래 "반환" 모양만 알면 되고, 서버 필드 이름은 이 파일 안에서만 다룬다.
// (axiosClient는 응답의 { data }를 언랩해서 반환하므로 .data를 다시 꺼내지 않는다.)
//
// 흐름: 목록 조회 → 응시 시작(attemptId 발급) → 응시 문항 조회 → 답안 제출 → 결과 및 해설 조회

// 백엔드 연결 전에는 true → 목업 데이터로 화면 확인
// 지금 백엔드는 퀴즈를 만드는 AI 워커가 연결되지 않아 실제 퀴즈 세트가 없다. 연결되면 false로 바꾼다.
export const USE_MOCK = false;

const mockResponse = (data) => Promise.resolve(data);

// 문제 유형 표기. 화면의 type 값('choice' | 'short')에 대응한다.
export const TYPE_LABEL = { choice: '객관식', short: '단답형' };

// 문제 카드 위 표기: '객관식 · 상황형'. 서버가 category를 주지 않으면 '객관식'만.
export const questionTypeLabel = (q) => [TYPE_LABEL[q.type], q.category].filter(Boolean).join(' · ');

// 서버 문제 유형 → 화면 유형. 지금 서버는 객관식(MULTIPLE_CHOICE)만 만든다.
const SERVER_TYPE = { MULTIPLE_CHOICE: 'choice', SHORT_ANSWER: 'short' };
const toType = (type) => SERVER_TYPE[type] ?? 'choice';

// 재응시 대기(3일)처럼 지금은 응시할 수 없을 때 서버가 내려주는 오류인지
export const isQuizConflict = (error) => error?.response?.data?.code === 'CONFLICT';
// 후임자가 아니라서 응시·결과를 볼 수 없을 때
export const isQuizForbidden = (error) => error?.response?.data?.code === 'FORBIDDEN';

// ---------- 팀 이름 ----------

// 백엔드에는 팀(소속) 이름 필드가 따로 없다. 인수인계 생성 때 '소속 직책'을 합쳐 roleName으로 저장한다.
// (HandoverCreate: roleName = `${org} ${role}` → '홍보팀 팀장') 그래서 인수인계 상세의 roleName 앞 단어를 팀 이름으로 쓴다.
// 팀 이름은 부제 장식이라, 조회에 실패해도 퀴즈 화면은 그대로 보여 준다.
// GET /handovers/{projectId} → { roleName, ... }
const getTeamName = (projectId) =>
  axiosClient
    .get(`/handovers/${projectId}`, { skipErrorAlert: true })
    .then((detail) => (detail?.roleName ?? '').trim().split(/\s+/)[0])
    .catch(() => '');

// ---------- 서버 응답 → 화면 모양 ----------

// 문제: { questionId, type, stem, options, topic } (결과 응답에는 sectionId도 있다)
const normalizeQuestion = (q) => ({
  id: q.questionId,
  type: toType(q.type),
  category: q.category ?? '', // 서버에 없음 (상황형/지식형)
  topicId: q.topic, // 서버는 영역 id 없이 이름(topic)만 준다. 이름을 id처럼 쓴다.
  topicName: q.topic,
  sectionId: q.sectionId ?? null, // 근거 문서 섹션 (해설의 '해당 섹션 다시 읽기')
  text: q.stem,
  options: q.options,
});

// 한 사람이 볼 수 있는 최대 응시 횟수 (기획: 1차 + 재응시 2번 = 3번)
// TODO: 서버가 상한을 정하고 내려주면 그 값으로 교체
export const MAX_ATTEMPTS = 3;

// 응시 기록 한 건. 서버 목록 응답에 attempts가 생기면 쓴다.
// n차 = 서버의 attemptNo. 2차부터는 재응시다.
const normalizeAttempt = (a) => ({
  attemptId: a.attemptId,
  round: a.attemptNo,
  retake: a.attemptNo >= 2,
  score: a.correctCount,
  total: a.totalCount,
  passed: a.passed,
  submittedAt: a.submittedAt,
  nextAllowedAt: a.nextAllowedAt ?? null,
});

// 다음 응시 안내 카드: 다음 회차(마지막 응시 + 1)와 응시 가능 일시.
// 서버 규칙: 미통과면 제출 3일 뒤(nextAllowedAt)부터, 통과했으면(nextAllowedAt = null) 바로 다시 볼 수 있다.
// 날짜는 서버 값을 그대로 쓰고 프론트에서 계산하지 않는다. 최대 응시 횟수를 다 쓰면 카드를 숨긴다.
const toNextAttempt = (attempts) => {
  const latest = attempts[0];
  const round = (latest?.round ?? 0) + 1;
  if (round > MAX_ATTEMPTS) return null;
  return { round, availableAt: latest?.nextAllowedAt ?? new Date().toISOString() };
};

// 목록: { items: [{ quizSetId, versionId, passingScore, questionCount, attempts? }], page, size, ... }
// items는 최신 퀴즈 세트가 앞.
const normalizeQuizList = (page, teamName) => {
  const items = page?.items ?? [];
  return items.map((raw) => {
    const attempts = (raw.attempts ?? []).map(normalizeAttempt);
    return {
      id: raw.quizSetId,
      versionId: raw.versionId,
      questionCount: raw.questionCount,
      passingScore: raw.passingScore,
      teamName,
      attempts,
      nextAttempt: toNextAttempt(attempts),
    };
  });
};

// 채점 결과: Result { attemptId, attemptNo?, correctCount, totalCount, score, passingScore, passed,
//   submittedAt, nextAllowedAt, versionId, questions: [QuestionResult], topics: [TopicResult] }
const normalizeResult = (raw, teamName) => {
  const questions = raw.questions.map(normalizeQuestion);
  return {
    teamName,
    passingScore: raw.passingScore,
    attempt: raw.attemptNo ?? null, // 서버 결과 응답에 없음
    submittedAt: raw.submittedAt,
    retakeAt: raw.nextAllowedAt ?? null, // 통과하면 null → 재응시 영역을 숨긴다
    correctCount: raw.correctCount,
    totalCount: raw.totalCount,
    passed: raw.passed,
    items: raw.questions.map((q, i) => ({
      questionId: q.questionId,
      type: questions[i].type,
      topicId: null, // 영역 번호가 없어 '1. 영역명' 대신 영역명만 보인다
      topicName: q.topic,
      correct: q.correct,
      aiEvaluation: q.aiEvaluation ?? '', // 단답형 AI 평가. 서버에 없음
    })),
    questions,
    grading: Object.fromEntries(
      raw.questions.map((q) => [
        q.questionId,
        { correct: q.correct, answerIndex: q.correctOption, myIndex: q.selectedOption, explanation: q.explanation },
      ]),
    ),
    weakAreas: raw.topics.map((t) => ({
      topicId: t.topic,
      topicName: t.topic,
      correct: t.correctCount,
      total: t.totalCount,
    })),
  };
};

// ---------- API ----------

// 퀴즈 목록 조회
// GET /handovers/{projectId}/quizzes?page=0&size=20
// 반환: [{
//   id, versionId, questionCount, passingScore, teamName,
//   attempts: [{ attemptId, round, retake, score, total, passed, submittedAt }],  // 최신 응시가 앞
//   nextAttempt: { round, availableAt } | null,                                   // 응시 횟수를 다 쓰면 null
// }]
export async function getQuizList(projectId) {
  if (USE_MOCK) return normalizeQuizList(mockQuizPage, mockQuizSet.teamName);
  const [page, teamName] = await Promise.all([
    axiosClient.get(`/handovers/${projectId}/quizzes`, { params: { page: 0, size: 20 } }),
    getTeamName(projectId),
  ]);
  return normalizeQuizList(page, teamName);
}

// 퀴즈 응시 시작. 응시(attempt)를 만들고 attemptId를 발급한다.
// 제출하지 않은 응시가 있으면 서버가 그 응시를 그대로 돌려준다. 재응시 대기 중이면 409 CONFLICT.
// POST /handovers/{projectId}/quizzes/{quizSetId}/attempts
// 반환: { attemptId, attemptNo, passingScore, startedAt }
export function startAttempt(projectId, quizSetId) {
  if (USE_MOCK) return mockResponse({ attemptId: mockQuizAttempt.attemptId, attemptNo: mockQuizAttempt.attempt });
  return axiosClient.post(`/handovers/${projectId}/quizzes/${quizSetId}/attempts`, null, { skipErrorAlert: true });
}

// 응시 문항 조회. 정답과 해설은 포함하지 않는다.
// GET /handovers/{projectId}/quizzes/{quizSetId}/attempts/{attemptId}
// 반환: { teamName, passingScore, attemptNo, questions: [{ id, type, category, topicId, topicName, text, options? }] }
export async function getAttemptQuestions(projectId, quizSetId, attemptId) {
  if (USE_MOCK) return mockQuizSet;
  const [raw, teamName] = await Promise.all([
    axiosClient.get(`/handovers/${projectId}/quizzes/${quizSetId}/attempts/${attemptId}`),
    getTeamName(projectId),
  ]);
  return {
    teamName,
    passingScore: raw.passingScore,
    attemptNo: raw.attemptNo,
    questions: raw.questions.map(normalizeQuestion),
  };
}

// 퀴즈 답안 제출. answers는 { [questionId]: 선택한 보기 index }
// 서버는 모든 문항의 답을 한 번에 받고, 제출 응답으로 채점 결과를 바로 준다.
// POST /handovers/{projectId}/quizzes/{quizSetId}/attempts/{attemptId}/submission
// 요청: { answers: [{ questionId, selectedOption }] }
// 반환: getAttemptResult와 같은 모양
export async function submitAttempt(projectId, quizSetId, attemptId, answers) {
  if (USE_MOCK) return getAttemptResult(projectId, quizSetId, attemptId);
  const body = {
    answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
      questionId: Number(questionId),
      selectedOption,
    })),
  };
  // 제출 직후 결과 화면이 결과를 다시 조회하므로 팀 이름은 여기서 조회하지 않는다
  return normalizeResult(
    await axiosClient.post(`/handovers/${projectId}/quizzes/${quizSetId}/attempts/${attemptId}/submission`, body),
    '',
  );
}

// 퀴즈 결과 및 해설 조회. 채점 결과 화면과 해설 화면이 같은 응답을 쓴다.
// GET /handovers/{projectId}/quizzes/{quizSetId}/attempts/{attemptId}/result
// 반환: {
//   teamName, passingScore, attempt, submittedAt, retakeAt, correctCount, totalCount, passed,
//   items: [{ questionId, type, topicId, topicName, correct, aiEvaluation }],   // 채점 결과 표
//   questions: [...getAttemptQuestions의 questions],                             // 해설: 문제 정의
//   grading: { [questionId]: { correct, answerIndex?, myIndex?, explanation } }, // 해설: 문항별 채점
//   weakAreas: [{ topicId, topicName, correct, total }],                         // 해설: 취약 영역 분석
// }
// - retakeAt이 null이면(통과) 재응시 영역을 숨긴다.
// - weakAreas의 순서와 영역별 문항 수(total)는 서버가 정해서 내려준다. (프론트에서 계산하지 않는다)
export async function getAttemptResult(projectId, quizSetId, attemptId) {
  if (USE_MOCK) {
    const { teamName, passingScore, questions } = mockQuizSet;
    const { attempt, submittedAt, retakeAt } = mockQuizAttempt;
    const correctCount = questions.filter((q) => mockQuizGrading[q.id].correct).length;
    return {
      teamName,
      passingScore,
      attempt,
      submittedAt,
      retakeAt,
      correctCount,
      totalCount: questions.length,
      passed: correctCount * 100 >= passingScore * questions.length,
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
    };
  }
  const [raw, teamName] = await Promise.all([
    axiosClient.get(`/handovers/${projectId}/quizzes/${quizSetId}/attempts/${attemptId}/result`),
    getTeamName(projectId),
  ]);
  return normalizeResult(raw, teamName);
}
