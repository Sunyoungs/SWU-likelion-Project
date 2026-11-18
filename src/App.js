import { BrowserRouter, Routes, Route } from 'react-router-dom';
import styles from './App.module.css';

import Layout from "./components/Layout";
import Login from './pages/Login';
import Join from './pages/Join';
import HandoverList from './pages/HandoverList';
import HandoverCreate from './pages/HandoverCreate';
import TaskCreate from './pages/TaskCreate';
import Interview from './pages/Interview';
import DocumentViewer from './pages/DocumentViewer';
import QuizList from './pages/QuizList';
import QuizSession from './pages/QuizSession';
import QnA from './pages/QnA';
import Mypage from './pages/Mypage';
import Loading from './pages/Loading';
import Notifications from './pages/Notifications';
import QnACreate from './pages/QnACreate';

function App() {
  return (
    <BrowserRouter>
      <div className={styles.appWrapper}>
        <Routes>
          {/* 첫 화면('/')과 '/login' 접속 시 로그인 페이지가 뜨도록 설정 */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<Join />} />
          <Route path="/loading" element={<Loading />} />
          
          {/* 기존 메인 레이아웃 및 하위 페이지 구조 */}
          <Route element={<Layout />}>
            <Route path="/handovers" element={<HandoverList />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="mypage" element={<Mypage />} />
            <Route path="handovers/create" element={<HandoverCreate />} />
            <Route path="handovers/:projectId">
              <Route path="tasks/create" element={<TaskCreate />} />
              <Route path="tasks/:taskId/interviews" element={<Interview />} />
              <Route path="documents" element={<DocumentViewer />} />
              <Route path="questions" element={<QnA />} />
              <Route path="questions/create" element={<QnACreate />} /> {/* 퀴즈 생성도 API 명세서에 없어서 임의로 작성 */}
              <Route path="quizzes" element={<QuizList />} />
              <Route path="quizzes/:quizSetId/attempts" element={<QuizSession />} />
            </Route>
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;