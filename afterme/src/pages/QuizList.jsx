import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';

function QuizList() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  return (
    <div>
      <div>예시</div>
      {/* TODO: 퀴즈 목록 구현 시 퀴즈 세트 id로 교체 */}
      <Button
        text="퀴즈 풀기"
        variant="primary"
        onClick={() => navigate(`/handovers/${projectId}/quizzes/1/attempts`)}
      />
    </div>
  )
}

export default QuizList;
