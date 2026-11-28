// 서버가 401(로그인 필요)을 돌려줬다는 사실을 화면 쪽에 알린다.
// axiosClient가 notifyUnauthorized()를 부르고, Layout이 onUnauthorized()로 받아 로그인 안내 화면을 띄운다.
const EVENT = 'afterme:unauthorized';

// 401 중 '다시 로그인해야 하는' 경우의 오류 코드
// UNAUTHORIZED: 토큰 없이 요청 / INVALID_ACCESS_TOKEN: 토큰 만료·위조 / INVALID_REFRESH_TOKEN: 갱신 토큰 만료·폐기
// 같은 401이라도 로그인 화면의 비밀번호 불일치(INVALID_CREDENTIALS)는 여기에 넣지 않는다.
const SESSION_ENDED_CODES = ['UNAUTHORIZED', 'INVALID_ACCESS_TOKEN', 'INVALID_REFRESH_TOKEN'];

export function isSessionEnded(error) {
  return SESSION_ENDED_CODES.includes(error?.response?.data?.code);
}

export function notifyUnauthorized() {
  window.dispatchEvent(new Event(EVENT));
}

// 구독을 해제하는 함수를 돌려준다 (useEffect cleanup에서 사용)
export function onUnauthorized(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
