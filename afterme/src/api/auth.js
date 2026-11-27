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

/**
 * 로그인
 * POST /api/auth/login · 인증 불필요
 * 성공 200 → { accessToken, refreshToken, tokenType, expiresIn(초) }
 * 실패 400 INVALID_INPUT / 401 INVALID_CREDENTIALS / 423 ACCOUNT_LOCKED
 * - 성공하면 토큰을 저장 → 이후 요청은 axiosClient 가 Authorization 헤더를 자동으로 붙임
 */
export async function login({ email, password }) {
  const data = await axiosClient.post(
    '/auth/login',
    { email, password },
    { skipErrorAlert: true },
  );
  saveTokens(data);
  return data;
}

// axiosClient 는 localStorage 의 'accessToken' 을 읽어 요청에 붙임
export function saveTokens({ accessToken, refreshToken, expiresIn }) {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  if (expiresIn) {
    localStorage.setItem('accessTokenExpiresAt', String(Date.now() + expiresIn * 1000));
  }
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('accessTokenExpiresAt');
}
