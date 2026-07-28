import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar, TopBar } from './components/common/Header';
import ATSDashboard from './pages/ATSDashboard';
import ResumeResultPage from './pages/ResumeResultPage';
import Leaderboard from './pages/Leaderboard';

import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import AuthPage from './pages/AuthPage';

const queryClient = new QueryClient();



// The ATS section uses the app shell (sidebar). Upload & Companies are
// top-nav-only pages, matching the reference design.
const Shell = () => {
  const { pathname } = useLocation();
  const showSidebar = pathname.startsWith('/ats') || pathname.startsWith('/leaderboard');

    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/ats" element={<ProtectedRoute><ATSDashboard /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/resumes/:id" element={<ProtectedRoute><ResumeResultPage /></ProtectedRoute>} />
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Shell />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

