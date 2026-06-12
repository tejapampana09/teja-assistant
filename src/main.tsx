import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider } from "./context/AuthContext";
import { BriefingPage } from "./features/briefing/BriefingPage";
import { LoginPage } from "./features/auth/LoginPage";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { ChatPage } from "./features/chat/ChatPage";
import { CommunicationPage } from "./features/communication/CommunicationPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { MemoryPage } from "./features/memory/MemoryPage";
import { TasksPage } from "./features/tasks/TasksPage";
import { VoicePage } from "./features/voice/VoicePage";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "chat", element: <ChatPage /> },
          { path: "voice", element: <VoicePage /> },
          { path: "communication", element: <CommunicationPage /> },
          { path: "briefing", element: <BriefingPage /> },
          { path: "memories", element: <MemoryPage /> },
          { path: "tasks", element: <TasksPage /> }
        ]
      }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
