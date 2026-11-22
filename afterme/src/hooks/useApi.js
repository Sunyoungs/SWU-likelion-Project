import { useEffect, useState } from 'react';

// fetcher: Promise를 반환하는 API 함수. deps가 바뀌면 다시 호출한다.
// 예) const { data, loading, error } = useApi(() => getQuizList(projectId), [projectId]);
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });
    fetcher()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
