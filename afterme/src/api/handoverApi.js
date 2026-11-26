import axiosClient from './axiosClient';
import { mockApi } from './handoverMock';

// 백엔드 연결 전에는 true → 목업 데이터로 화면 확인
// 백엔드 연결 후에는 false 로 바꿔 주세요.
export const USE_MOCK = true;

const toList = (res) => (Array.isArray(res) ? res : res?.items ?? res?.content ?? []);

const ROLE_PRIORITY = ['PREDECESSOR', 'SUCCESSOR'];
const pickMyRole = (raw) => {
  const roles = raw.myRoles ?? (raw.myRole ? [raw.myRole] : []);
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
};

const findParticipant = (raw, role) => {
  const p = (raw.participants ?? []).find((x) => x.role === role);
  if (p) return { name: p.name, assignedRole: p.roleName ?? '' };
  const legacy = role === 'PREDECESSOR' ? raw.predecessor : raw.successor; // 목업용
  return legacy ?? { name: '-', assignedRole: '' };
};

const toScore = (v) => (typeof v === 'number' ? v : v?.score ?? v?.total ?? 0);

export const normalizeHandover = (raw = {}) => ({
  projectId: raw.id ?? raw.projectId,
  organizationId: raw.organizationId,
  title: raw.title ?? raw.projectName ?? '',
  roleName: raw.roleName ?? '',
  myRole: pickMyRole(raw), // 'PREDECESSOR' | 'SUCCESSOR'
  myRoles: raw.myRoles ?? (raw.myRole ? [raw.myRole] : []),
  status: raw.status ?? 'IN_PROGRESS', // 'IN_PROGRESS' | 'COMPLETED' (백엔드 enum 확인 필요)
  startDate: raw.startDate ?? raw.createdAt,
  deadline: raw.deadline,
  createdAt: raw.createdAt,
  completedAt: raw.completedAt,
  dDay: raw.dDay,
  overdue: Boolean(raw.overdue),
  predecessor: findParticipant(raw, 'PREDECESSOR'),
  successor: findParticipant(raw, 'SUCCESSOR'),
  completenessScore: toScore(raw.completeness ?? raw.completenessScore),
  // ↓ 아래 3개는 현재 명세서 응답에 없음 → 백엔드 추가 전까지 기본값
  minCompletenessScore: raw.minCompletenessScore ?? raw.completeness?.minScore ?? 80,
  quizStatus: raw.quizStatus ?? 'NOT_TAKEN', // 'NOT_TAKEN' | 'PASSED' | 'FAILED'
  quizCutline: raw.quizCutline ?? 70,
  resourceVersion: raw.resourceVersion,
});

const normalizeVersionMeta = (raw = {}) => ({
  versionId: raw.versionId ?? raw.id,
  versionLabel: raw.versionLabel ?? (raw.versionNumber ? `v${raw.versionNumber}` : 'v1.0'),
  status: raw.status ?? 'PUBLISHED', // 'DRAFT' | 'PUBLISHED'
  createdAt: raw.publishedAt ?? raw.createdAt,
});

export const normalizeVersion = (raw = {}) => ({
  ...normalizeVersionMeta(raw),
  authorName: raw.authorName ?? raw.author?.name ?? '',
  description: raw.description ?? raw.changeSummary ?? '',
  acknowledged: Boolean(raw.acknowledged ?? raw.acknowledgedAt),
  sections: (raw.sections ?? []).map((s, i) => ({
    key: s.key ?? s.sectionKey ?? `section-${i + 1}`,
    title: s.title ?? '',
    basis: s.basis ?? s.evidence ?? '',
    warning: s.warning ?? null,
    fields: (s.fields ?? []).map((f, j) => ({
      key: f.key ?? `field-${i}-${j}`,
      label: f.label ?? '',
      multiline: Boolean(f.multiline),
      values: Array.isArray(f.values) ? f.values : [f.value ?? ''],
    })),
    attachments: (s.attachments ?? []).map((a) => ({
      attachmentId: a.attachmentId ?? a.id,
      fileName: a.fileName ?? a.name ?? '',
      size: a.size ?? a.fileSize ?? 0,
    })),
  })),
});

// GET /handovers?page=0&size=100 (organizationId?, status? 선택)
export const fetchHandovers = async ({ organizationId, status } = {}) => {
  const res = USE_MOCK
    ? await mockApi.getHandovers()
    : await axiosClient.get('/handovers', {
        params: {
          page: 0,
          size: 100,
          ...(organizationId && { organizationId }),
          ...(status && { status }),
        },
      });
  return toList(res).map(normalizeHandover);
};

// GET /handovers/{projectId}
export const fetchHandoverDetail = async (projectId) => {
  const res = USE_MOCK
    ? await mockApi.getHandover(projectId)
    : await axiosClient.get(`/handovers/${projectId}`);
  return normalizeHandover(res);
};

// POST /handovers/{projectId}/completion
export const completeHandover = (projectId) =>
  USE_MOCK
    ? mockApi.completeHandover(projectId)
    : axiosClient.post(`/handovers/${projectId}/completion`);


// POST /handovers-invitations/verify  body: { code }
export const verifyInvitationCode = async (code) => {
  const res = USE_MOCK
    ? await mockApi.verifyInvitation(code)
    : await axiosClient.post('/handovers-invitations/verify', { code }, { skipErrorAlert: true });
  return {
    organizationId: res?.organizationId,
    organizationName: res?.organizationName ?? '',
    role: res?.role ?? 'SUCCESSOR',
    teamName: res?.roleName ?? res?.teamName ?? '', // 명세서에 없음 → 없으면 '역할 : 후임자'만 표시
  };
};

// POST /handovers-invitations/join  body: { code }  응답: { projectId }
export const joinInvitation = (code) =>
  USE_MOCK
    ? mockApi.joinInvitation(code)
    : axiosClient.post('/handovers-invitations/join', { code }, { skipErrorAlert: true });

// GET /handovers/{projectId}/documents → GET .../documents/{documentId}/versions/{versionId}
export const fetchDocumentView = async (projectId, versionId) => {
  if (USE_MOCK) {
    const res = await mockApi.getDocument(projectId, versionId);
    return { documentId: res.documentId, version: normalizeVersion(res.version) };
  }

  const docs = toList(
    await axiosClient.get(`/handovers/${projectId}/documents`, { skipErrorAlert: true })
  );
  const doc = docs[0];
  if (!doc) return null;

  const documentId = doc.documentId ?? doc.id;
  const targetVersionId =
    versionId ?? doc.publishedVersionId ?? doc.latestVersionId ?? doc.currentVersionId;
  if (!targetVersionId) return null;

  const version = await axiosClient.get(
    `/handovers/${projectId}/documents/${documentId}/versions/${targetVersionId}`,
    { skipErrorAlert: true }
  );
  return { documentId, version: normalizeVersion(version) };
};

// GET /handovers/{projectId}/documents/{documentId}/versions
export const fetchDocumentVersions = async (projectId, documentId) => {
  const res = USE_MOCK
    ? await mockApi.getVersions()
    : await axiosClient.get(`/handovers/${projectId}/documents/${documentId}/versions`);
  return toList(res).map(normalizeVersionMeta);
};

// PUT .../versions/{versionId}/read — 열람 일시 자동 기록
export const recordDocumentRead = (projectId, documentId, versionId) =>
  USE_MOCK
    ? Promise.resolve()
    : axiosClient.put(
        `/handovers/${projectId}/documents/${documentId}/versions/${versionId}/read`,
        null,
        { skipErrorAlert: true }
      );

// PUT .../versions/{versionId}/acknowledgement — 후임자 문서 숙지 확인
export const acknowledgeDocument = (projectId, documentId, versionId) =>
  USE_MOCK
    ? mockApi.acknowledge(versionId)
    : axiosClient.put(
        `/handovers/${projectId}/documents/${documentId}/versions/${versionId}/acknowledgement`
      );

// POST .../documents/{documentId}/versions — 공개본 기반 수정 초안 생성
export const createRevisionDraft = (projectId, documentId) =>
  USE_MOCK
    ? mockApi.createRevision()
    : axiosClient.post(`/handovers/${projectId}/documents/${documentId}/versions`);

// PATCH .../versions/{versionId} — 초안 수정
export const updateDocumentDraft = (projectId, documentId, versionId, body) =>
  USE_MOCK
    ? mockApi.updateDraft(versionId, body)
    : axiosClient.patch(
        `/handovers/${projectId}/documents/${documentId}/versions/${versionId}`,
        body
      );

// GET /handovers/{projectId}/attachments/{attachmentId}/download-url
export const getAttachmentDownloadUrl = async (projectId, attachmentId) => {
  if (USE_MOCK) return { url: null, expiresAt: null };
  const res = await axiosClient.get(
    `/handovers/${projectId}/attachments/${attachmentId}/download-url`,
    { skipErrorAlert: true }
  );
  return { url: res?.downloadUrl ?? res?.url ?? null, expiresAt: res?.expiresAt ?? null };
};

// GET .../documents/{documentId}/versions — 버전 카드용 (작성자 · 설명 포함)
export const fetchVersionHistory = async (projectId, documentId) => {
  const res = USE_MOCK
    ? await mockApi.getVersions()
    : await axiosClient.get(`/handovers/${projectId}/documents/${documentId}/versions`);
  return toList(res).map(normalizeVersion);
};

// GET .../documents/{documentId}/versions/{versionId} — 변경 사항 비교용 상세
export const fetchVersionDetail = async (projectId, documentId, versionId) => {
  if (USE_MOCK) {
    const res = await mockApi.getDocument(projectId, versionId);
    return normalizeVersion(res.version);
  }
  const res = await axiosClient.get(
    `/handovers/${projectId}/documents/${documentId}/versions/${versionId}`
  );
  return normalizeVersion(res);
};

export const normalizeQuestion = (raw = {}) => ({
  threadId: raw.threadId ?? raw.id,
  title: raw.title ?? '',
  content: raw.content ?? raw.body ?? '',
  answer: raw.answer?.content ?? raw.answer ?? raw.replies?.[0]?.content ?? '',
  status: raw.status,
});

// GET /handovers/{projectId}/questions
export const fetchQuestions = async (projectId) => {
  const res = USE_MOCK
    ? await mockApi.getQuestions()
    : await axiosClient.get(`/handovers/${projectId}/questions`);
  return toList(res).map(normalizeQuestion);
};

// (검색 API 명세가 확정되면 GET /handovers/{projectId}/document-sections/search 로 교체)
export const searchDocument = async ({ projectId, keyword, sections = [] }) => {
  const q = keyword.toLowerCase();
  const results = [];

  sections.forEach((section, index) => {
    const location = `${index + 1}. ${section.title}`;
    section.fields.forEach((field) =>
      field.values.forEach((value) =>
        String(value)
          .split('\n')
          .forEach((line) => {
            if (line.toLowerCase().includes(q)) {
              results.push({ id: `b-${results.length}`, type: 'BODY', sectionKey: section.key, location, text: line });
            }
          })
      )
    );
    section.attachments.forEach((file) => {
      if (file.fileName.toLowerCase().includes(q)) {
        results.push({
          id: `f-${results.length}`,
          type: 'FILE',
          sectionKey: section.key,
          location: `${location} · ${file.fileName}`,
          text: file.fileName,
        });
      }
    });
  });

  let questionList = [];
  try {
    questionList = await fetchQuestions(projectId);
  } catch {
    questionList = [];
  }
  questionList.forEach((qa) => {
    const text = [qa.title, qa.content, qa.answer].find((t) => t && t.toLowerCase().includes(q));
    if (text) {
      results.push({
        id: `q-${qa.threadId}`,
        type: 'QNA',
        sectionKey: null,
        location: `Q&A · ${qa.title}`,
        text,
        threadId: qa.threadId,
      });
    }
  });
  return results;
};

// GET /handovers/{projectId}/completeness + GET /handovers/{projectId}/completion
export const fetchHandoverStatus = async (projectId) => {
  const [completeness, completion] = USE_MOCK
    ? await Promise.all([mockApi.getCompleteness(projectId), mockApi.getCompletion(projectId)])
    : await Promise.all([
        axiosClient.get(`/handovers/${projectId}/completeness`),
        axiosClient.get(`/handovers/${projectId}/completion`),
      ]);

  return {
    score: completeness?.score ?? completeness?.completenessScore ?? 0,
    targetScore: completeness?.targetScore ?? completeness?.minCompletenessScore ?? 80,
    missingItems: (completeness?.missingItems ?? completeness?.items ?? []).map((m, i) => ({
      id: m.id ?? i,
      target: m.target ?? m.category, // 'QNA' | 'TASK' | 'DOCUMENT' | 'QUIZ'
      categoryLabel: m.categoryLabel ?? m.category ?? '',
      title: m.title ?? '',
      description: m.description ?? '',
      points: m.points ?? 0,
      actionLabel: m.actionLabel ?? '작성하러 가기',
    })),
    milestones: (completion?.milestones ?? []).map((m, i) => ({
      key: m.key ?? `m-${i}`,
      label: m.label ?? '',
      date: m.date,
    })),
    currentStage: completion?.currentStage
      ? { label: completion.currentStage.label, done: Boolean(completion.currentStage.done) }
      : null,
  };
};