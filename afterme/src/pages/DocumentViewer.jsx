import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';

function DocumentViewer() {
  const navigate = useNavigate();
  // 퀴즈 해설에서 근거를 보러 온 경우에만 state가 있다.
  // { returnTo: { path, state }, topicId } — returnTo는 돌아갈 화면, topicId는 근거가 되는 영역 id
  const { state } = useLocation();
  const returnTo = state?.returnTo;

  return (
    <div>
      <div>예시</div>
      {returnTo && (
        <Button
          text="해설로 돌아가기"
          variant="primary"
          onClick={() => navigate(returnTo.path, { state: returnTo.state })}
        />
      )}
    </div>
  )
}

export default DocumentViewer;
