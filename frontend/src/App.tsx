import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { authService } from "./auth/authService";
import { Login } from "./auth/Login.tsx";

import Sidebar from "./layouts/Sidebar.tsx";
import ToastContainer from "./layouts/ToastContainer.tsx";
import { RoomProvider } from "./context/RoomContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";

import CreateQuiz from "./management/CreateQuiz.tsx";
import EditQuiz from "./management/EditQuiz.tsx";
import ListQuizzes from "./management/ListQuizzes.tsx";
import SetupRoom from "./management/SetupRoom.tsx";
import RoomCode from "./room-access/RoomCode.tsx";
import NicknameEntry from "./room-access/NicknameEntry.tsx";
import Lobby from "./room-play/Lobby.tsx";
import LiveRoom from "./room-play/LiveRoom.tsx";

import "./App.css";

const TeacherDashboard = () => (
  <div>
    <h1>Panel de profesores</h1>
  </div>
);

const ProtectedRoute = ({
  children,
  isLoggedIn,
}: {
  children: React.ReactElement;
  isLoggedIn: boolean;
}) => {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({
  children,
  isLoggedIn,
}: {
  children: React.ReactElement;
  isLoggedIn: boolean;
}) => {
  return isLoggedIn ? <Navigate to="/quizzes" replace /> : children;
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const isLoggedIn = authService.isLoggedIn();

  const layoutClass = isLoggedIn
    ? `app-container ${sidebarOpen ? "menu-open" : "menu-closed"}`
    : "public-layout";

  const mainClass = isLoggedIn ? "main-content" : "full-width-content";

  return (
    <ToastProvider>
      <ToastContainer />
      <RoomProvider>
        <div className={layoutClass}>
          {isLoggedIn && (
            <>
              <Sidebar
                isOpen={sidebarOpen}
                toggle={() => setSidebarOpen(!sidebarOpen)}
              />
              <button
                className="sidebar-toggle-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? "X" : "☰"}
              </button>
              <div
                className="mobile-overlay"
                onClick={() => setSidebarOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSidebarOpen(false);
                }}
                role="button"
                tabIndex={0}
                aria-label="Cerrar menú lateral"
              ></div>
            </>
          )}

          <main className={mainClass}>
            <div className="content-body">
              <Routes>
                <Route
                  path="/"
                  element={
                    <PublicRoute isLoggedIn={isLoggedIn}>
                      <RoomCode />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/join/:code"
                  element={
                    <PublicRoute isLoggedIn={isLoggedIn}>
                      <NicknameEntry />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/login"
                  element={
                    <PublicRoute isLoggedIn={isLoggedIn}>
                      <Login />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quizzes"
                  element={
                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                      <ListQuizzes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quizzes/create"
                  element={
                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                      <CreateQuiz />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quizzes/edit/:id"
                  element={
                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                      <EditQuiz />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quizzes/setup/:id"
                  element={
                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                      <SetupRoom />
                    </ProtectedRoute>
                  }
                />

                <Route path="/lobby/:roomId" element={<Lobby />} />
                <Route path="/live/:roomId" element={<LiveRoom />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </RoomProvider>
    </ToastProvider>
  );
}

export default App;
