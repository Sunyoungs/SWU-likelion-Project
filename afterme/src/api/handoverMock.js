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

const shiftDate = (value, offset) => {
  const d = new Date(value);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

/* ------------------------------ 인수인계 목록 ------------------------------ */

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

const findHandover = (projectId) => handovers.find((h) => String(h.projectId) === String(projectId));

/* ------------------------------ 초대 코드 ------------------------------ */

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

/* ------------------------------ 인수인계서 버전 ------------------------------ */

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
          '동아리 공식 인스타그램과 블로그를 운영합니다.\n행사 2주 전 홍보물 시안을 만들고, 회장단 검수 후 업로드합니다.\n포스터 · 현수막 인쇄는 정문 앞 한빛인쇄에 발주합니다.',
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
      {
        key: 'tools',
        label: '사용 도구 및 계정',
        values: ['콘텐츠 일정은 Notion, 디자인은 Canva를 사용합니다.', '공용 계정 권한은 담당자 변경 시 별도로 이전합니다.'],
      },
    ],
  },
  {
    key: 'exceptions',
    title: '예외 상황 대응',
    basis: 'AI 인터뷰 답변 불충분, 추가 작성이 필요합니다.',
    warning: '대응 절차와 에스컬레이션 대상이 비어 있어요.',
    fields: [
      { key: 'type', label: '예외 상황 유형', values: ['게시물 예약 업로드 실패', '인쇄물 납품 지연'] },
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

const setValues = (sections, sectionKey, fieldKey, values) => {
  const field = sections.find((s) => s.key === sectionKey)?.fields.find((f) => f.key === fieldKey);
  if (field) field.values = values;
};

// v1.1 — 사용 도구 및 계정 권한 내용 보완
const v11Sections = clone(baseSections);
setValues(v11Sections, 'procedure', 'tools', [
  '콘텐츠 일정은 Notion, 디자인은 Canva를 사용합니다.',
  '공용 계정 권한은 담당자 변경 시 관리자(회장) 확인 후 이전합니다.',
]);

// v1.2 — Q&A 답변 반영, 연락처 · 참고 자료 추가
const v12Sections = clone(v11Sections);
setValues(v12Sections, 'contacts', 'name', ['학생지원팀 주무관', '한빛인쇄 실장']);
setValues(v12Sections, 'contacts', 'org', ['교내 게시물 승인', '포스터 · 현수막 발주']);
setValues(v12Sections, 'contacts', 'phone', ['내선 2214', '010-0000-0000']);
v12Sections
  .find((s) => s.key === 'references')
  .attachments.push({ attachmentId: 4, fileName: '25기_콘텐츠캘린더.xlsx', size: 204800 });

const versions = [
  {
    versionId: 1,
    versionLabel: 'v1.0',
    status: 'PUBLISHED',
    authorName: '김정아',
    description: '최초 공개 승인 · AI 초안 기반',
    acknowledged: false,
    createdAt: daysFromNow(-6),
    sections: baseSections,
  },
  {
    versionId: 2,
    versionLabel: 'v1.1',
    status: 'DRAFT',
    authorName: '김정아',
    description: '사용 도구 · 계정 권한 보완',
    acknowledged: false,
    createdAt: daysFromNow(-3),
    sections: v11Sections,
  },
  {
    versionId: 3,
    versionLabel: 'v1.2',
    status: 'DRAFT',
    authorName: '김정아',
    description: 'Q&A 답변 반영 · 연락처 추가',
    acknowledged: false,
    createdAt: daysFromNow(-1),
    sections: v12Sections,
  },
];

// versionId 가 없으면 가장 최근 '공개 승인' 버전
const findVersion = (versionId) => {
  if (versionId) return versions.find((v) => String(v.versionId) === String(versionId));
  const published = versions.filter((v) => v.status === 'PUBLISHED');
  return published[published.length - 1] ?? versions[versions.length - 1];
};

/* ------------------------------ Q&A ------------------------------ */

const questions = [
  {
    threadId: 1,
    title: '포스터 인쇄 발주는 언제 해야 하나요?',
    content: '행사 포스터 인쇄는 몇 주 전에 발주해야 하나요?',
    answer: '행사 2주 전까지 한빛인쇄에 발주하면 됩니다.',
    status: 'RESOLVED',
  },
  {
    threadId: 2,
    title: '인스타그램 공용 계정 비밀번호는 어디서 확인하나요?',
    content: '공용 계정 로그인 정보를 어디에서 받을 수 있는지 궁금해요.',
    answer: '',
    status: 'UNRESOLVED',
  },
];

/* ------------------------------ 목업 API ------------------------------ */

export const mockApi = {
  getHandovers: () => wait(handovers),

  getHandover: (projectId) => {
    const item = findHandover(projectId);
    return item ? wait(item) : fail(404, 'RESOURCE_NOT_FOUND', '인수인계를 찾을 수 없습니다.');
  },

  verifyInvitation: (code) => {
    const invitation = findInvitation(code);
    return invitation ? wait(invitation) : fail(404, 'RESOURCE_NOT_FOUND', '해당 초대코드는 존재하지 않습니다.');
  },

  joinInvitation: (code) => {
    const invitation = findInvitation(code);
    if (!invitation) return fail(404, 'RESOURCE_NOT_FOUND', '해당 초대코드는 존재하지 않습니다.');
    if (findHandover(invitation.projectId)) {
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
    const item = findHandover(projectId);
    if (item) item.status = 'COMPLETED';
    return wait(null);
  },

  getDocument: (projectId, versionId) => {
    const version = findVersion(versionId);
    return version
      ? wait({ documentId: 1, version })
      : fail(404, 'RESOURCE_NOT_FOUND', '인수인계서 버전을 찾을 수 없습니다.');
  },

  getVersions: () => wait(versions.map(({ sections, ...meta }) => meta)),

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

  getQuestions: () => wait(questions),

  // GET /handovers/{projectId}/completeness 목업
  getCompleteness: (projectId) => {
    const item = findHandover(projectId);
    if (!item) return fail(404, 'RESOURCE_NOT_FOUND', '인수인계를 찾을 수 없습니다.');
    const met = item.completenessScore >= item.minCompletenessScore;
    return wait({
      score: item.completenessScore,
      targetScore: item.minCompletenessScore,
      missingItems: met
        ? []
        : [
            {
              id: 1,
              category: 'QNA',
              categoryLabel: '질문 해결률',
              title: 'Q&A 질문 미답변 2건',
              description: '후임자가 남긴 질문 2건이 아직 해결되지 않았어요.',
              points: 6,
              actionLabel: '작성하러 가기',
            },
            {
              id: 2,
              category: 'TASK',
              categoryLabel: '업무 등록',
              title: '주요 연락처 1건 누락',
              description: '학생지원팀 주무관의 연락처가 입력되지 않았어요.',
              points: 4,
              actionLabel: '작성하러 가기',
            },
            {
              id: 3,
              category: 'QUIZ',
              categoryLabel: '퀴즈',
              title: '퀴즈 충족 점수 미달',
              description: '후임자의 퀴즈 점수가 최소 기준에 도달하지 않았어요.',
              points: 5,
              actionLabel: '점수 확인하기',
            },
          ],
    });
  },

  // GET /handovers/{projectId}/completion 목업
  getCompletion: (projectId) => {
    const item = findHandover(projectId);
    if (!item) return fail(404, 'RESOURCE_NOT_FOUND', '인수인계를 찾을 수 없습니다.');
    return wait({
      milestones: [
        { key: 'created', label: '생성', date: item.startDate },
        { key: 'published', label: '공개', date: shiftDate(item.startDate, 2) },
        { key: 'quiz1', label: '1차 퀴즈', date: shiftDate(item.startDate, 11) },
        { key: 'approval', label: '최종 승인', date: shiftDate(item.deadline, -2) },
        { key: 'quiz2', label: '2차 퀴즈', date: shiftDate(item.deadline, -2) },
        { key: 'deadline', label: '마감', date: item.deadline },
      ],
      currentStage: { label: '1차 후임자 퀴즈', done: item.quizStatus === 'PASSED' },
    });
  },
};