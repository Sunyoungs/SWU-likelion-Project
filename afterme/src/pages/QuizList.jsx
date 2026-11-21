import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import { getQuizList } from '../api/quiz';
import { useApi } from '../hooks/useApi';

function QuizList() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { data: quizzes, error } = useApi(() => getQuizList(projectId), [projectId]);

  if (error) return <p>퀴즈 목록을 불러오지 못했어요.</p>;
  if (!quizzes) return null;

  // TODO: 퀴즈 목록 디자인이 나오면 교체 (지금은 임시 표시)
  return (
    <div>
      {quizzes.map((quiz) => (
        <Button
          key={quiz.id}
          text={`${quiz.title} 풀기`}
          variant="primary"
          onClick={() => navigate(`/handovers/${projectId}/quizzes/${quiz.id}/attempts`)}
        />
      ))}
    </div>
  );
}

export default QuizList;
