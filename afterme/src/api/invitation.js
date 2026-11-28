import axiosClient from './axiosClient';

/**
 * 초대 코드 확인 (참여 상태는 바뀌지 않음)
 * POST /api/handover-invitations/verify · 로그인 필요
 * 요청: { code } · 성공 200 → { organizationId, organizationName }
 * 실패 400 형식 오류 / 401 인증 실패 / 404 유효한 코드 없음 / 409 이미 사용한 코드
 */
export function verifyInvitation(code) {
  return axiosClient.post('/handover-invitations/verify', { code }, { skipErrorAlert: true });
}

/**
 * 인수인계 참여 확정 ('참여하고 시작하기')
 * POST /api/handover-invitations/join · 로그인 필요
 * 요청: { code } · 성공 200 → { projectId }
 * 실패 400 형식 오류 / 401 인증 실패 / 404 유효한 코드 없음 / 409 이미 사용한 코드·이미 참여한 계정
 */
export function joinInvitation(code) {
  return axiosClient.post('/handover-invitations/join', { code }, { skipErrorAlert: true });
}
