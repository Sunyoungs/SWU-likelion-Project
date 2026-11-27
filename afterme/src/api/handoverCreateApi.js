import axiosClient from './axiosClient';

/*
 * HandoverCreate / HandoverFlow 전용 API 모듈
 *   백엔드와 맞출 때 `TODO(BE)` 표시된 곳만 확인하면 됩니다.
 *   endpoint는 모두 명세서의 상대 경로예요. (axiosClient.baseURL이 `/api`로 끝나야 해요)
 */

/* TODO(BE): 후임자 등록 요청 형태
   'batch'  → POST /invitations { successors: [{ name, email }] } 한 번
   'single' → POST /invitations { name, email } 를 후임자마다 한 번씩 */
const INVITATION_MODE = 'batch';

/* AI job 폴링: 1초 간격, 최대 90회 */
const JOB_POLL_MS = 1000;
const JOB_POLL_MAX = 90;

/** 서버가 HTTP 응답(4xx/5xx)을 준 경우에만 던지는 에러. 화면이 status로 메시지를 고릅니다. */
export class ApiError extends Error {
  constructor(status, message, { code, errors, jobId, timeout } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.jobId = jobId;
    this.timeout = timeout;
  }
}

/* 명세서 공통 응답: { data: ... }. axiosClient 인터셉터가 이미 벗겨 주면 그대로 쓰고, 아니면 여기서 벗겨요.
   204 No Content는 빈 값('' / undefined)이 그대로 나와요. */
const unwrap = (res) => {
  const body = res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res ? res.data : res;
  return body && typeof body === 'object' && !Array.isArray(body) && 'data' in body && Object.keys(body).length === 1
    ? body.data
    : body;
};

/* axios 에러 → ApiError (응답이 있을 때만). 응답이 없으면(네트워크 오류) 원본 에러를 그대로 던져요. */
const toApiError = (err) => {
  if (err instanceof ApiError) return err;
  const status = err?.response?.status ?? err?.status;
  if (!status) return err;
  const raw = err?.response?.data ?? err?.data;
  const body = raw && typeof raw === 'object' ? raw : {};
  return new ApiError(status, body.message ?? err.message, { code: body.code, errors: body.errors });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const asList = (v) => (Array.isArray(v) ? v : v?.items ?? v?.content ?? v?.questions ?? []);

/* 서버 값이 문자열이 아니어도(객체/숫자/null) 화면에서는 항상 문자열로 쓰도록 보정 */
const asText = (v) => {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return asText(v.content ?? v.originalContent ?? v.text ?? v.answer ?? '');
  return String(v);
};

const upper = (s) => String(s ?? '').toUpperCase();
const isDone = (s) => ['SUCCEEDED', 'SUCCESS', 'COMPLETED', 'DONE'].includes(upper(s));
const isFail = (s) => ['FAILED', 'FAILURE', 'ERROR', 'CANCELED', 'CANCELLED'].includes(upper(s));

/* 인터뷰 질문 하나를 화면에서 쓰는 모양으로 정리.
   화면은 q.id 를 key/답변 저장소로 쓰기 때문에, 업무(세션)가 여러 개여도 겹치지 않게 sessionId를 붙여요. */
const normalizeQuestion = (raw, sessionId, fallbackFollowUpOf) => {
  const src = raw ?? {};
  const questionId = src.questionId ?? src.id;
  const sid = src.sessionId ?? sessionId;
  const rawParentId = src.parentQuestionId ?? src.followUpOf ?? fallbackFollowUpOf ?? null;
  const followUpOf = rawParentId
    ? String(rawParentId).includes(':')
      ? String(rawParentId)
      : `${sid}:${rawParentId}`
    : null;

  return {
    id: `${sid}:${questionId}`,
    questionId,
    sessionId: sid,
    text: asText(src.text ?? src.content ?? src.question),
    savedAnswer: asText(src.savedAnswer ?? src.answer),
    // 서버가 추가 질문의 부모를 내려주면 사용 (TODO(BE): 필드명 확인)
    parentQuestionId: rawParentId,
    followUpOf,
    followUpIndex: src.followUpIndex ?? src.sequence ?? undefined,
  };
};

/* 인터뷰 시작/조회 응답 → { taskId, sessionId, questions } */
const normalizeSession = (raw, taskId) => {
  const src = raw ?? {};
  const sessionId = src.sessionId ?? src.id;
  return {
    taskId: src.taskId ?? taskId,
    sessionId,
    questions: asList(src.questions ?? src.items).map((q) => normalizeQuestion(q, sessionId)),
  };
};

/* AI 초안 응답 → HandoverDraft의 values 키 구조로 매핑 (TODO(BE): 초안 응답 필드명 확인) */
const normalizeDraft = (raw) => {
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const src = isObj(raw?.content) ? raw.content : isObj(raw?.sections) ? raw.sections : raw;

  if (!isObj(src)) return {};

  const keys = [
    'taskNames', 'cycle', 'importance', 'overview',
    'summary', 'deadlines', 'tools',
    'exTypes', 'exProcedure', 'exTargets',
    'contactNames', 'contactRoles', 'contactInfos',
  ];
  const mapped = {};
  keys.forEach((k) => {
    if (src[k] !== undefined && src[k] !== null) mapped[k] = src[k];
  });
  return mapped;
};

const codeOf = (res) =>
  typeof res === 'string'
    ? res
    : res?.code ?? res?.inviteCode ?? res?.invitationCode ?? res?.participationCode ?? '';

/* accessToken 인자는 호환을 위해 남겨 뒀어요.
   Authorization 헤더는 axiosClient(인터셉터)가 붙이도록 맡겨요.
   여기서 직접 붙이면 토큰 갱신(refresh) 후에도 예전 토큰으로 덮어써서 401이 날 수 있어요.
   (axiosClient가 토큰을 붙이지 않는 구조라면 아래 opts에 헤더를 다시 추가하세요.) */
// eslint-disable-next-line no-unused-vars
export function createHandoverApi(_accessToken) {
  const opts = (extra = {}) => ({ ...extra, headers: { ...(extra.headers ?? {}) }, skipErrorAlert: true });

  const call = async (fn) => {
    try {
      return unwrap(await fn());
    } catch (err) {
      throw toApiError(err);
    }
  };

  /* AI 작업(추가 질문/초안 생성 등)은 비동기 job일 수 있어서, jobId가 오면 완료될 때까지 폴링해요.
     GET /handovers/{projectId}/ai-jobs/{jobId}
     TODO(BE): status 값(SUCCEEDED/COMPLETED/FAILED 등)과 결과 필드(result) 이름 확인
     idFallback: 응답에 jobId가 없을 때 id를 jobId로 볼지 (세션 응답처럼 id가 다른 뜻이면 false) */
  const waitForJob = async (projectId, first, { idFallback = true } = {}) => {
    const jobId = first?.jobId ?? (idFallback ? first?.id : undefined);

    if (!jobId || isDone(first?.status)) return first;
    if (isFail(first?.status)) throw new ApiError(500, 'AI 작업에 실패했어요.', { jobId });

    for (let i = 0; i < JOB_POLL_MAX; i += 1) {
      await sleep(JOB_POLL_MS);
      const job = await call(() => axiosClient.get(`/handovers/${projectId}/ai-jobs/${jobId}`, opts()));
      if (isDone(job?.status)) return job;
      if (isFail(job?.status)) throw new ApiError(500, 'AI 작업에 실패했어요.', { jobId });
    }
    throw new ApiError(504, 'AI 작업 시간이 초과되었어요. 잠시 후 다시 시도해 주세요.', { jobId, timeout: true });
  };

  /* 같은 요청(key)을 다시 시도할 때 job을 새로 만들지 않도록 기억해 둬요.
     - 실패한 job  → POST /handovers/{projectId}/ai-jobs/{jobId}/retries 로 재시도
     - 시간 초과   → 같은 job을 이어서 폴링 */
  const stuckJobs = new Map(); // key -> { jobId, timeout }

  const runJob = async (key, projectId, start) => {
    const stuck = stuckJobs.get(key);
    stuckJobs.delete(key);

    let first;
    if (stuck?.timeout) {
      first = { jobId: stuck.jobId };
    } else if (stuck) {
      try {
        const retried = await call(() =>
          axiosClient.post(`/handovers/${projectId}/ai-jobs/${stuck.jobId}/retries`, null, opts())
        );
        // 재시도 응답의 status는 이전(FAILED) 값일 수 있어서 jobId만 쓰고 다시 폴링해요.
        first = { jobId: retried?.jobId ?? retried?.id ?? stuck.jobId };
      } catch {
        first = undefined; // 재시도 불가(404/409 등)면 새 job으로 요청
      }
    }
    if (first === undefined) first = await start();

    try {
      return await waitForJob(projectId, first);
    } catch (err) {
      if (err instanceof ApiError && err.jobId) stuckJobs.set(key, { jobId: err.jobId, timeout: !!err.timeout });
      throw err;
    }
  };

  return {
    /* POST /handovers → 프로젝트 생성 */
    createProject: ({ organizationId, title, roleName, deadline, predecessorMemberIds }) =>
      call(() =>
        axiosClient.post(
          '/handovers',
          { organizationId, title, roleName, deadline, predecessorMemberIds }, // TODO(BE): 필드명 확인
          opts()
        )
      ),

    /* GET /handovers/{projectId}/tasks → 업무 목록 조회 */
    getTasks: async (projectId) => {
      const res = await call(() => axiosClient.get(`/handovers/${projectId}/tasks`, opts()));
      return asList(res?.tasks ?? res);
    },

    /* POST /handovers/{projectId}/tasks → 업무 등록 (본문은 HandoverCreate의 buildTaskBody 참고) */
    createTask: (projectId, body) =>
      call(() => axiosClient.post(`/handovers/${projectId}/tasks`, body, opts())), // TODO(BE): 필드명 확인

    /* POST /handovers/{projectId}/tasks/{taskId}/attachments → multipart 업로드
       Content-Type은 직접 지정하지 않아요. (브라우저가 boundary를 포함해 자동으로 붙여야 서버가 파싱할 수 있어요) */
    uploadAttachment: (projectId, taskId, file) => {
      const form = new FormData();
      form.append('file', file); // TODO(BE): 파트 이름이 'file'인지 확인
      return call(() =>
        axiosClient.post(`/handovers/${projectId}/tasks/${taskId}/attachments`, form, opts())
      );
    },

    /* POST /handovers/{projectId}/tasks/{taskId}/interviews → 인터뷰 시작(AI 질문 받기) */
    startInterview: async (projectId, taskId) => {
      let res = await call(() =>
        axiosClient.post(`/handovers/${projectId}/tasks/${taskId}/interviews`, null, opts())
      );
      const hasQuestions = (r) => asList(r?.questions ?? r?.items).length > 0;

      // 질문이 아직 없는 경우: (job이면 완료까지 기다렸다가) 세션을 조회해서 질문을 받아요.
      if (res && !hasQuestions(res)) {
        let job = null;
        if (res.jobId) job = await waitForJob(projectId, res, { idFallback: false });
        const sessionId =
          res.sessionId ?? job?.result?.sessionId ?? job?.sessionId ?? (res.jobId ? null : res.id);
        if (sessionId) {
          res = await call(() => axiosClient.get(`/handovers/${projectId}/interviews/${sessionId}`, opts()));
        }
      }
      return normalizeSession(res, taskId);
    },

    /* PUT /handovers/{projectId}/interviews/{sessionId}/questions/{questionId}/answer → 원본 답변 저장 */
    saveAnswer: (projectId, q, content) =>
      call(() =>
        axiosClient.put(
          `/handovers/${projectId}/interviews/${q.sessionId}/questions/${q.questionId}/answer`,
          { content }, // TODO(BE): 필드명(content/answer) 확인
          opts()
        )
      ),

    /* POST /handovers/{projectId}/interviews/{sessionId}/follow-up-jobs → AI 추가 질문
       반환: 해당 질문에 달린 추가 질문 배열 (화면이 새로 생긴 것만 골라 붙여요) */
    requestFollowUps: async (projectId, q) => {
      const job = await runJob(`follow-up:${q.id}`, projectId, () =>
        call(() =>
          axiosClient.post(
            `/handovers/${projectId}/interviews/${q.sessionId}/follow-up-jobs`,
            { questionId: q.questionId }, // TODO(BE): 어떤 질문의 추가 질문인지 지정하는 방식 확인
            opts()
          )
        )
      );
      const list = asList(job?.result?.questions ?? job?.questions ?? job?.result ?? []);
      return list.map((c) => normalizeQuestion(c, q.sessionId, q.questionId));
    },

    /* POST /handovers/{projectId}/interviews/{sessionId}/confirmations → 답변 확정 */
    confirmInterview: (projectId, sessionId) =>
      call(() => axiosClient.post(`/handovers/${projectId}/interviews/${sessionId}/confirmations`, null, opts())),

    /* PATCH /handovers/{projectId}/deadline → 마감일 연장 */
    updateDeadline: (projectId, deadline) =>
      call(() => axiosClient.patch(`/handovers/${projectId}/deadline`, { deadline }, opts())),

    /* PATCH /handovers/{projectId}/completion/criteria → 최소 완성도 / 퀴즈 커트라인 */
    setCriteria: (projectId, { completion, quizCutoff }) =>
      call(() =>
        axiosClient.patch(
          `/handovers/${projectId}/completion/criteria`,
          { minCompletenessScore: completion, quizCutline: quizCutoff }, // TODO(BE): 필드명 확인
          opts()
        )
      ),

    /* POST /handovers/{projectId}/invitations → 후임자 등록 + 참여 코드 발급
       successors: [{ email, name }]
       onRegistered(email, code): 한 명 등록될 때마다 호출 (중간에 실패해도 이미 등록된 사람을 기억하기 위함)
       반환: { [email]: code }
       TODO(BE): 요청 형태(INVITATION_MODE)와 응답의 코드 필드명 확인 */
    createInvitations: async (projectId, successors, onRegistered) => {
      const out = {};
      const done = (email, code) => {
        out[email] = code;
        onRegistered?.(email, code);
      };
      const url = `/handovers/${projectId}/invitations`;

      if (INVITATION_MODE === 'single') {
        for (const s of successors) {
          const res = await call(() => axiosClient.post(url, { name: s.name, email: s.email }, opts()));
          done(s.email, codeOf(res));
        }
        return out;
      }

      const res = await call(() => axiosClient.post(url, { successors }, opts()));
      // 후임자별 코드 목록으로 오는 경우와, 코드 하나만 오는 경우를 모두 처리
      const rows = asList(res?.invitations ?? res?.successors ?? res);
      successors.forEach((s, i) => {
        const row = rows.find((r) => r?.email === s.email) ?? rows[i];
        done(s.email, codeOf(row) || codeOf(res));
      });
      return out;
    },

    /* POST /handovers/{projectId}/tasks/{taskId}/document-generation-jobs → 인수인계서 초안 생성 요청 */
    generateDocument: async (projectId, taskId) => {
      const job = await runJob(`document:${taskId}`, projectId, () =>
        call(() =>
          axiosClient.post(`/handovers/${projectId}/tasks/${taskId}/document-generation-jobs`, null, opts())
        )
      );
      const result = job?.result ?? job ?? {};
      const documentId = result.documentId ?? result.document?.id ?? null;
      const versionId = result.versionId ?? result.version?.id ?? result.latestVersionId ?? null;
      return { documentId, versionId, draft: normalizeDraft(result) };
    },

    /* GET /handovers/{projectId}/documents → 인수인계서 목록 조회 */
    getDocuments: async (projectId) => {
      const res = await call(() => axiosClient.get(`/handovers/${projectId}/documents`, opts()));
      return asList(res?.documents ?? res);
    },

    /* GET /handovers/{projectId}/documents/{documentId}/versions/{versionId} → 인수인계서 버전 상세 조회 */
    getDocumentVersion: async (projectId, documentId, versionId) => {
      const res = await call(() =>
        axiosClient.get(`/handovers/${projectId}/documents/${documentId}/versions/${versionId}`, opts())
      );
      return { raw: res, draft: normalizeDraft(res) };
    },

    /* PATCH /handovers/{projectId}/documents/{documentId}/versions/{versionId} → 인수인계서 초안 수정 */
    updateDocumentVersion: (projectId, documentId, versionId, values) =>
      call(() =>
        axiosClient.patch(
          `/handovers/${projectId}/documents/${documentId}/versions/${versionId}`,
          { content: values }, // TODO(BE): 초안 수정 요청 바디 필드명 확인
          opts()
        )
      ),

    /* POST /handovers/{projectId}/documents/{documentId}/versions/{versionId}/publication → 인수인계서 버전 공개 */
    publishDocumentVersion: (projectId, documentId, versionId) =>
      call(() =>
        axiosClient.post(
          `/handovers/${projectId}/documents/${documentId}/versions/${versionId}/publication`,
          null,
          opts()
        )
      ),
  };
}