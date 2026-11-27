import axiosClient from './axiosClient';

/**
 * 내 정보 조회
 * GET /api/users/me · 로그인 필요 (axiosClient 가 토큰을 자동으로 붙임)
 * 성공 200 → { id, email, name, createdAt }
 * 실패 401 UNAUTHORIZED / 401 INVALID_ACCESS_TOKEN / 404 USER_NOT_FOUND
 */
export function getMe() {
  return axiosClient.get('/users/me', { skipErrorAlert: true });
}

/**
 * 프로필 수정 (이름만 수정 가능)
 * PATCH /api/users/me · 로그인 필요
 * 요청: { name } – 필수, 공백만 불가, 최대 50자
 * 성공 200 → 수정된 { id, email, name, createdAt }
 * 실패 400 INVALID_INPUT / 401 / 404 USER_NOT_FOUND
 */
export function updateMe({ name }) {
  return axiosClient.patch('/users/me', { name }, { skipErrorAlert: true });
}
