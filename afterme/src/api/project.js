import axiosClient from './axiosClient';

// 인수인계(프로젝트) 상세에서 여러 화면이 함께 쓰는 정보: 내 역할, 팀 이름, 참여자 이름
// GET /handovers/{projectId}
// 응답: { title, roleName, myRoles: ['PREDECESSOR' | 'SUCCESSOR'], participants: [{ memberId, name, role }], ... }
// 반환: { role: 'predecessor' | 'successor' | null, teamName, names: { predecessor, successor } }

const ROLE = { PREDECESSOR: 'predecessor', SUCCESSOR: 'successor' };

// 백엔드에는 팀(소속) 이름 필드가 따로 없다. 인수인계 생성 때 '소속 직책'을 합쳐 roleName으로 저장한다.
// (HandoverCreate: roleName = `${org} ${role}` → '홍보팀 팀장') 그래서 roleName 앞 단어를 팀 이름으로 쓴다.
const toTeamName = (roleName) => (roleName ?? '').trim().split(/\s+/)[0];

export async function getProjectInfo(projectId) {
  const raw = await axiosClient.get(`/handovers/${projectId}`, { skipErrorAlert: true });
  const myRoles = raw.myRoles ?? [];
  // 전임자이면서 후임자인 경우는 전임자 화면을 우선한다
  const role = myRoles.includes('PREDECESSOR') ? 'predecessor' : myRoles.includes('SUCCESSOR') ? 'successor' : null;
  const names = {};
  (raw.participants ?? []).forEach((p) => {
    const key = ROLE[p.role];
    if (key && !names[key]) names[key] = p.name;
  });
  return { role, teamName: toTeamName(raw.roleName), names };
}
