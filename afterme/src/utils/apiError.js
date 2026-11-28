import { isSessionEnded } from '../api/authEvents';

// 서버 오류를 화면에서 다루기 쉬운 종류로 나눈다
// auth: 다시 로그인 필요 / server: 응답 없음·5xx / conflict: 409 / forbidden: 403 / notFound: 404 / invalid: 400 / other
export function errorKind(error) {
  if (isSessionEnded(error)) return 'auth';
  const status = error?.response?.status;
  if (!error?.response || status >= 500) return 'server';
  if (status === 409) return 'conflict';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 400) return 'invalid';
  return 'other';
}

// 제출(등록·수정) 버튼 옆에 보여 줄 문구.
// conflict·forbidden·notFound: 화면마다 409·403·404의 뜻이 달라 호출하는 쪽에서 넘길 수 있다.
// 다시 로그인해야 하는 경우는 Layout이 공통 안내를 띄우므로 null을 돌려준다.
export function submitErrorMessage(error, { conflict, forbidden, notFound } = {}) {
  switch (errorKind(error)) {
    case 'auth':
      return null;
    case 'server':
      return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'conflict':
      return conflict ?? '지금은 처리할 수 없어요. 새로고침한 뒤 다시 시도해 주세요.';
    case 'forbidden':
      return forbidden ?? '이 작업을 할 권한이 없어요.';
    case 'notFound':
      return notFound ?? '대상을 찾을 수 없어요. 목록에서 다시 확인해 주세요.';
    case 'invalid':
      return error.response.data?.message ?? '입력한 내용을 다시 확인해 주세요.';
    default:
      return '요청을 처리하지 못했어요. 다시 시도해 주세요.';
  }
}
