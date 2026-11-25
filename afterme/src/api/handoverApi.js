import axiosClient from './axiosClient';
import { mockApi } from './handoverMock';

export const USE_MOCK = true;

const toList = (res) => (Array.isArray(res) ? res : res?.items ?? res?.content ?? []);

export const normalizeHandover = (raw = {}) => ({
  projectId: raw.projectId ?? raw.id,
  title: raw.projectName ?? raw.title ?? '',
  myRole: raw.myRole ?? raw.role,
  status: raw.status ?? 'IN_PROGRESS',
  startDate: raw.startDate ?? raw.createdAt,
  deadline: raw.deadline,
  createdAt: raw.createdAt,
  predecessor: raw.predecessor ?? { name: '-', assignedRole: '' },
  successor: raw.successor ?? { name: '-', assignedRole: '' },
  completenessScore: raw.completenessScore ?? 0,
  minCompletenessScore: raw.minCompletenessScore ?? 80,
  quizStatus: raw.quizStatus ?? 'NOT_TAKEN', 
  quizCutline: raw.quizCutline ?? 70,
});

const normalizeVersionMeta = (raw = {}) => ({
  versionId: raw.versionId ?? raw.id,
  versionLabel: raw.versionLabel ?? (raw.versionNumber ? `v${raw.versionNumber}` : 'v1.0'),
  status: raw.status ?? 'PUBLISHED',
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

// GET /handovers
export const fetchHandovers = async () => {
  const res = USE_MOCK ? await mockApi.getHandovers() : await axiosClient.get('/handovers');
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

// POST /handover-invitations/verify
// 요청 body 필드명(invitationCode)은 가정 — 백엔드와 확인 필요
export const verifyInvitationCode = async (code) => {
  const res = USE_MOCK
    ? await mockApi.verifyInvitation(code)
    : await axiosClient.post(
        '/handover-invitations/verify',
        { invitationCode: code },
        { skipErrorAlert: true }
      );
  return {
    organizationName: res?.organizationName ?? '',
    role: res?.role ?? 'SUCCESSOR',
    teamName: res?.teamName ?? res?.assignedRole ?? '',
    projectId: res?.projectId,
  };
};

// POST /handover-invitations/join  (명세서에는 '/joini'로 적혀 있음 — 오타 확인 필요)
export const joinInvitation = (code) =>
  USE_MOCK
    ? mockApi.joinInvitation(code)
    : axiosClient.post(
        '/handover-invitations/join',
        { invitationCode: code },
        { skipErrorAlert: true }
      );

// GET /handovers/{projectId}/documents → GET .../documents/{documentId}/versions/{versionId}
// versionId 를 넘기지 않으면 문서의 최신 공개 버전을 조회
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
  if (USE_MOCK) return { url: null };
  const res = await axiosClient.get(
    `/handovers/${projectId}/attachments/${attachmentId}/download-url`
  );
  return { url: res?.url ?? res?.downloadUrl ?? null };
};