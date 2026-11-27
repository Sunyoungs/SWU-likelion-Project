import axiosClient from './axiosClient';

/**
 * 회원가입
 * POST /api/auth/signup · 인증 불필요
 * 성공 201 → { id, email, name }
 * 실패 400 INVALID_INPUT / 409 DUPLICATE_EMAIL
 * - 에러는 화면(입력칸 아래)에 직접 보여 주므로 공통 alert 는 끔 (skipErrorAlert)
 */
export function signup({ email, password, name }) {
  return axiosClient.post('/auth/signup', { email, password, name }, { skipErrorAlert: true });
}
