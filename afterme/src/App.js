import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import styles from './App.module.css';

import Layout from "./components/Layout";
import Login from './pages/Login';
import Signup from './pages/Signup';
import HandoverList from './pages/HandoverList';
import HandoverCreate from './pages/HandoverCreate';
import TaskCreate from './pages/TaskCreate';
import Interview from './pages/Interview';
import DocumentViewer from './pages/DocumentViewer';
import QuizList from './pages/QuizList';
import QuizSession from './pages/QuizSession';
import QuizResult from './pages/QuizResult';
import QuizExplanation from './pages/QuizExplanation';
import QnA from './pages/QnA';
import Mypage from './pages/Mypage';
import Loading from './pages/Loading';
import Notifications from './pages/Notifications';
import QnACreate from './pages/QnACreate';
import QnADetail from './pages/QnADetail';

function App() {
  return (
    <BrowserRouter>
      <div className={styles.appWrapper}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<Signup />} />
          <Route path="/loading" element={<Loading />} />

          <Route element={<Layout />}>
            <Route path="/handovers" element={<HandoverList />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="mypage" element={<Mypage />} />
            <Route path="handovers/create" element={<HandoverCreate />} />
            <Route path="handovers/:projectId">
              {/* /handovers/:projectId 만 입력하면 인수인계서 열람 화면으로 이동 */}
              <Route index element={<Navigate to="documents" replace />} />
              <Route path="tasks/create" element={<TaskCreate />} />
              <Route path="tasks/:taskId/interviews" element={<Interview />} />
              <Route path="documents" element={<DocumentViewer />} />
              <Route path="questions" element={<QnA />} />
              <Route path="questions/create" element={<QnACreate />} /> {/* 퀴즈 생성도 API 명세서에 없어서 임의로 작성 */}
              <Route path="questions/:threadId" element={<QnADetail />} />
              <Route path="questions/:threadId/edit" element={<QnACreate />} /> {/* 질문 수정 화면 (PATCH questions/{threadId}) */}
              <Route path="quizzes" element={<QuizList />} />
              <Route path="quizzes/:quizSetId/attempts" element={<QuizSession />} />
              <Route path="quizzes/:quizSetId/attempts/:attemptId" element={<QuizResult />} /> {/* 채점 결과도 API 명세서에 없어서 임의로 작성 */}
              <Route path="quizzes/:quizSetId/attempts/:attemptId/explanations" element={<QuizExplanation />} /> {/* 해설도 API 명세서에 없어서 임의로 작성 */}
            </Route>
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
