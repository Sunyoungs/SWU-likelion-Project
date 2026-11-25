// 백엔드 연결 전 화면 확인용 목업 데이터 / 목업 API
// handoverApi.js 의 USE_MOCK 이 true 일 때만 사용됩니다.

// true로 바꾸면 '참여 중인 인수인계가 없어요' 빈 화면부터 확인할 수 있어요.
// (빈 화면에서 초대 코드 LNK-26-7QX4 를 입력하면 목록에 카드가 추가됩니다)
const START_EMPTY = false;

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const wait = (data, ms = 250) => new Promise((resolve) => setTimeout(() => resolve(clone(data)), ms));
const fail = (status, code, message, ms = 250) =>
  new Promise((_, reject) =>
    setTimeout(() => reject({ response: { status, data: { code, message } } }), ms)
  );

const daysFromNow = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

const handovers = START_EMPTY
  ? []
  : [
      {
        projectId: 10001,
        projectName: 'LINKER 26기 홍보팀 인수인계',
        myRole: 'PREDECESSOR',
        status: 'IN_PROGRESS',
        startDate: daysFromNow(-20),
        deadline: daysFromNow(5),
        createdAt: daysFromNow(-20),
        predecessor: { name: '김정아', assignedRole: '홍보팀장' },
        successor: { name: '이서연', assignedRole: '홍보팀원' },
        completenessScore: 62,
        minCompletenessScore: 80,
        quizStatus: 'NOT_TAKEN',
        quizCutline: 70,
      },
      {
        projectId: 10002,
        projectName: '정기 행사 운영 인수인계',
        myRole: 'PREDECESSOR',
        status: 'IN_PROGRESS',
        startDate: daysFromNow(-30),
        deadline: daysFromNow(-1),
        createdAt: daysFromNow(-30),
        predecessor: { name: '김정아', assignedRole: '기획팀장' },
        successor: { name: '박민지', assignedRole: '기획팀원' },
        completenessScore: 48,
        minCompletenessScore: 80,
        quizStatus: 'NOT_TAKEN',
        quizCutline: 70,
      },
      {
        projectId: 10003,
        projectName: '회계 · 예산 관리 인수인계',
        myRole: 'SUCCESSOR',
        status: 'IN_PROGRESS',
        startDate: daysFromNow(-5),
        deadline: daysFromNow(12),
        createdAt: daysFromNow(-5),
        predecessor: { name: '최유진', assignedRole: '총무' },
        successor: { name: '김정아', assignedRole: '차기 총무' },
        completenessScore: 55,
        minCompletenessScore: 80,
        quizStatus: 'NOT_TAKEN',
        quizCutline: 70,
      },
      {
        projectId: 10004,
        projectName: '대외협력 · 협찬 인수인계',
        myRole: 'SUCCESSOR',
        status: 'COMPLETED',
        startDate: daysFromNow(-40),
        deadline: daysFromNow(-10),
        createdAt: daysFromNow(-40),
        predecessor: { name: '정하늘', assignedRole: '대외협력팀장' },
        successor: { name: '김정아', assignedRole: '대외협력팀원' },
        completenessScore: 92,
        minCompletenessScore: 80,
        quizStatus: 'PASSED',
        quizCutline: 70,
      },
    ];

const invitations = {
  'LNK-26-7QX4': {
    organizationName: '서울여자대학교 연합동아리 LINKER',
    role: 'SUCCESSOR',
    teamName: '26기 홍보팀',
    projectId: 10005,
    projectName: 'LINKER 26기 홍보팀 SNS 운영',
  },
};

const findInvitation = (code = '') => invitations[code.trim().toUpperCase()];

const baseSections = [
  {
    key: 'overview',
    title: '업무 개요',
    basis: 'AI 인터뷰 답변 3건, 등록 자료 2건',
    fields: [
      { key: 'taskName', label: '업무명', values: ['SNS 채널 운영 및 홍보물 제작'] },
      { key: 'cycle', label: '업무 주기', values: ['매주 월 · 목 게시물 업로드', '분기별 홍보 캠페인 기획'] },
      { key: 'importance', label: '중요도', values: ['상'] },
      {
        key: 'detail',
        label: '업무 개요 상세',
        multiline: true,
        values: [
          '동아리 공식 인스타그램과 블로그를 운영합니다.\n행사 2주 전 홍보물 시안을 만들고, 회장단 검수 후 업로드합니다.',
        ],
      },
    ],
  },
  {
    key: 'procedure',
    title: '정기 업무 절차',
    basis: 'AI 인터뷰 답변 5건',
    fields: [
      {
        key: 'summary',
        label: '절차 요약',
        multiline: true,
        values: ['1) 콘텐츠 캘린더 확인 → 2) Canva로 시안 제작 → 3) 회장단 검수 → 4) 예약 업로드 → 5) 반응 리포트 작성'],
      },
      { key: 'deadlines', label: '주요 마감 일정', values: ['매월 마지막 주 금요일 월간 리포트 제출'] },
      { key: 'tools', label: '관련 시스템 도구', values: ['Canva', 'Instagram 비즈니스 계정', 'Notion 콘텐츠 캘린더'] },
    ],
  },
  {
    key: 'exceptions',
    title: '예외 상황 대응',
    basis: 'AI 인터뷰 답변 불충분, 추가 작성이 필요합니다.',
    warning: '대응 절차와 에스컬레이션 대상이 비어 있어요.',
    fields: [
      { key: 'type', label: '예외 상황 유형', values: ['게시물 예약 업로드 실패'] },
      { key: 'action', label: '대응 절차 및 조치 방법', multiline: true, values: [''] },
      { key: 'escalation', label: '담당 에스컬레이션 대상', values: [''] },
    ],
  },
  {
    key: 'contacts',
    title: '주요 연락처',
    basis: '연락처 정보 누락, 직접 입력이 필요합니다.',
    warning: '담당자 연락처 정보가 비어 있어요.',
    fields: [
      { key: 'name', label: '담당자 이름', values: [''] },
      { key: 'org', label: '소속 및 역할', values: [''] },
      { key: 'phone', label: '연락처', values: [''] },
    ],
  },
  {
    key: 'references',
    title: '참고 자료',
    basis: '업로드 파일 3건',
    fields: [],
    attachments: [
      { attachmentId: 1, fileName: '00동아리 26년도 동아리 규칙.pdf', size: 356352 },
      { attachmentId: 2, fileName: '홍보물 시안.jpeg', size: 356352 },
      { attachmentId: 3, fileName: '협찬 자료 정리 표.xlsx', size: 356352 },
    ],
  },
];

const versions = [
  {
    versionId: 1,
    versionLabel: 'v1.0',
    status: 'PUBLISHED',
    authorName: '김정아',
    description: '최초 공개 승인 · AI 초안 기반',
    acknowledged: false,
    createdAt: daysFromNow(-3),
    sections: baseSections,
  },
];

const findVersion = (versionId) =>
  versionId ? versions.find((v) => String(v.versionId) === String(versionId)) : versions[versions.length - 1];

export const mockApi = {
  getHandovers: () => wait(handovers),

  getHandover: (projectId) => {
    const item = handovers.find((h) => String(h.projectId) === String(projectId));
    return item ? wait(item) : fail(404, 'RESOURCE_NOT_FOUND', '인수인계를 찾을 수 없습니다.');
  },

  verifyInvitation: (code) => {
    const invitation = findInvitation(code);
    return invitation ? wait(invitation) : fail(404, 'RESOURCE_NOT_FOUND', '해당 초대코드는 존재하지 않습니다.');
  },

  joinInvitation: (code) => {
    const invitation = findInvitation(code);
    if (!invitation) return fail(404, 'RESOURCE_NOT_FOUND', '해당 초대코드는 존재하지 않습니다.');
    if (handovers.some((h) => h.projectId === invitation.projectId)) {
      return fail(409, 'CONFLICT', '이미 참여 중인 인수인계입니다.');
    }
    handovers.unshift({
      projectId: invitation.projectId,
      projectName: invitation.projectName,
      myRole: invitation.role,
      status: 'IN_PROGRESS',
      startDate: daysFromNow(0),
      deadline: daysFromNow(14),
      createdAt: daysFromNow(0),
      predecessor: { name: '김정아', assignedRole: '25기 홍보팀장' },
      successor: { name: '나', assignedRole: invitation.teamName },
      completenessScore: 40,
      minCompletenessScore: 80,
      quizStatus: 'NOT_TAKEN',
      quizCutline: 70,
    });
    return wait({ projectId: invitation.projectId });
  },

  completeHandover: (projectId) => {
    const item = handovers.find((h) => String(h.projectId) === String(projectId));
    if (item) item.status = 'COMPLETED';
    return wait(null);
  },

  getDocument: (projectId, versionId) => {
    const version = findVersion(versionId);
    return version
      ? wait({ documentId: 1, version })
      : fail(404, 'RESOURCE_NOT_FOUND', '인수인계서 버전을 찾을 수 없습니다.');
  },

  getVersions: () =>
    wait(versions.map(({ sections, ...meta }) => meta)),

  createRevision: () => {
    const base = versions[versions.length - 1];
    const created = {
      ...clone(base),
      versionId: base.versionId + 1,
      versionLabel: `v1.${versions.length}`,
      status: 'DRAFT',
      description: '공개본 기반 수정 초안',
      createdAt: new Date().toISOString(),
    };
    versions.push(created);
    return wait({ versionId: created.versionId });
  },

  updateDraft: (versionId, body) => {
    const target = findVersion(versionId);
    if (target && body?.sections) {
      body.sections.forEach((patch) => {
        const section = target.sections.find((s) => s.key === patch.key);
        patch.fields.forEach((fieldPatch) => {
          const field = section?.fields.find((f) => f.key === fieldPatch.key);
          if (field) field.values = fieldPatch.values.length ? fieldPatch.values : [''];
        });
      });
    }
    return wait(null);
  },

  acknowledge: (versionId) => {
    const target = findVersion(versionId);
    if (target) target.acknowledged = true;
    return wait(null);
  },
};
