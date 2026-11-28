import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HandoverCreate from './HandoverCreate';
import HandoverGenerating from './HandoverGenerating';
import HandoverDraft from './HandoverDraft';
import { ApiError, createHandoverApi } from '../api/handoverCreateApi';

const DRAFT_SECTIONS = 6;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PUBLISH_ERROR = {
  400: '후임자 이름과 이메일을 다시 확인해 주세요.',
  401: '로그인이 만료되었어요. 다시 로그인해 주세요.',
  403: '이 인수인계서의 전임자만 후임자를 등록할 수 있어요.',
  404: '인수인계서를 찾을 수 없어요.',
  409: '현재 상태와 충돌해서 처리하지 못했어요. 새로고침 후 다시 시도해 주세요.',
};

export default function HandoverFlow({
  organizationId,
  accessToken,
  currentMemberId,
  onPublished,
  onSaveDraft,
}) {
  const api = useMemo(() => createHandoverApi(accessToken), [accessToken]);

  const [phase, setPhase] = useState('form');
  const [project, setProject] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [aiDraft, setAiDraft] = useState(null);
  const [docMeta, setDocMeta] = useState({ documentId: null, versionId: null });
  const [progress, setProgress] = useState({ done: 0, drafted: 0 });
  const [genError, setGenError] = useState(false);

  const alive = useRef(true);
  /* 이미 등록한 후임자 (email -> 참여 코드). 공개 승인을 재시도해도 중복 등록되지 않게 해요. */
  const invited = useRef(new Map());
  /* 초안 화면에서 추가로 올린 파일 중 업로드를 끝낸 File (snapshot.uploadedFiles가 없을 때만 사용) */
  const uploadedHere = useRef(new Set());
  /* 버전 공개까지 끝났는지. 공개 승인을 재시도해도 다시 공개 요청을 보내지 않게 해요. */
  const published = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const generate = useCallback(async (proj, snap) => {
    setGenError(false);
    setProgress({ done: 0, drafted: 0 });
    setPhase('generating');

    const updateProgress = (p) => {
      if (alive.current) setProgress((prev) => ({ ...prev, ...p }));
    };

    try {
      const projectId = proj.projectId ?? proj.id;
      let taskId = snap?.tasks?.[0]?.taskId;
      if (!taskId) {
        const tasks = await api.getTasks(projectId);
        taskId = tasks[0]?.taskId ?? tasks[0]?.id;
      }

      updateProgress({ done: 1 });
      const generated = await api.generateDocument(projectId, taskId);
      updateProgress({ done: 2 });

      for (let i = 1; i <= DRAFT_SECTIONS; i += 1) {
        await wait(120);
        updateProgress({ drafted: i });
      }
      updateProgress({ done: 3 });

      let { documentId, versionId, draft } = generated;
      if (!documentId || !versionId) {
        const docs = await api.getDocuments(projectId);
        const doc = docs[0];
        documentId = documentId ?? doc?.documentId ?? doc?.id ?? null;
        versionId = versionId ?? doc?.latestVersionId ?? doc?.versionId ?? doc?.currentVersionId ?? null;
      }

      if (documentId && versionId && Object.keys(draft ?? {}).length === 0) {
        const versionRes = await api.getDocumentVersion(projectId, documentId, versionId);
        draft = versionRes.draft;
      }

      if (!alive.current) return;
      setDocMeta({ documentId, versionId });
      setAiDraft(draft ?? {});
      updateProgress({ done: 4 });
      await wait(300);
      if (alive.current) setPhase('draft');
    } catch {
      if (alive.current) setGenError(true);
    }
  }, [api]);

  const handleCreated = (data, snap) => {
    setSnapshot(snap);
    // HandoverCreate에서 실제로 등록까지 끝난 후임자만 기억 (email -> 참여 코드)
    Object.entries(snap?.invitedCodes ?? {}).forEach(([email, code]) => invited.current.set(email, code));

    if (project) {
      setPhase('draft');
      return;
    }
    setProject(data);
    generate(data, snap);
  };

  const successors = (snapshot?.successors ?? [])
    .filter((s) => s.email.trim())
    .map((s) => ({ email: s.email.trim(), name: s.name.trim() }));

  /* 초안 화면(5. 참고 자료)에서 새로 추가한 파일을 첫 번째 업무에 업로드 */
  const uploadNewFiles = async (projectId, files) => {
    const taskId = snapshot?.tasks?.[0]?.taskId;
    if (!taskId) return;
    const uploaded = snapshot?.uploadedFiles ?? uploadedHere.current;
    for (const f of files ?? []) {
      if (uploaded.has(f)) continue;
      await api.uploadAttachment(projectId, taskId, f);
      uploaded.add(f);
    }
  };

  const saveDraft = async (values, files) => {
    const projectId = project.projectId ?? project.id;
    await uploadNewFiles(projectId, files);
    // 이미 공개한 버전은 수정 요청을 다시 보내지 않아요. (공개 후 수정은 새 버전으로 만들어야 해요)
    if (docMeta.documentId && docMeta.versionId && !published.current) {
      await api.updateDocumentVersion(projectId, docMeta.documentId, docMeta.versionId, values);
    }
    await onSaveDraft?.(projectId, values, files);
  };

  const publish = async (values, files) => {
    const projectId = project.projectId ?? project.id;

    try {
      await saveDraft(values, files);

      // 공개하는 순간 알림/이메일이 나가므로, 후임자를 먼저 등록한 뒤 공개해요.
      // (HandoverCreate에서 아직 등록되지 않은 후임자만 등록)
      const pending = successors.filter((s) => !invited.current.has(s.email));
      if (pending.length > 0) {
        await api.createInvitations(projectId, pending, (email, code) => invited.current.set(email, code));
      }

      if (docMeta.documentId && docMeta.versionId && !published.current) {
        await api.publishDocumentVersion(projectId, docMeta.documentId, docMeta.versionId);
        published.current = true;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(PUBLISH_ERROR[err.status] ?? err.message ?? '공개하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
      throw new Error('네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
    }

    onPublished?.(
      project,
      successors.map((s) => ({ ...s, code: invited.current.get(s.email) }))
    );
  };

  return (
    <>
      <div hidden={phase !== 'form'}>
        <HandoverCreate
          organizationId={organizationId}
          accessToken={accessToken}
          currentMemberId={currentMemberId}
          createdProject={project}
          onCreated={handleCreated}
        />
      </div>

      {phase === 'generating' && (
        <HandoverGenerating
          progress={progress}
          interviewCount={snapshot.answeredCount}
          fileCount={snapshot.files.length}
          total={DRAFT_SECTIONS}
          error={genError}
          onRetry={() => generate(project, snapshot)}
        />
      )}

      {snapshot && aiDraft && (
        <div hidden={phase !== 'draft'}>
          <HandoverDraft
            snapshot={snapshot}
            aiDraft={aiDraft}
            successors={successors}
            onBack={() => setPhase('form')}
            onSave={saveDraft}
            onPublish={publish}
          />
        </div>
      )}
    </>
  );
}
