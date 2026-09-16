import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from './components/common/Header';
import ATSDashboard from './pages/ATSDashboard';
import ResumeResultPage from './pages/ResumeResultPage';
import Leaderboard from './pages/Leaderboard';

import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import { useAuth } from './contexts/AuthContext';
const queryClient = new QueryClient();


// Every route uses the same top-nav-only shell, matching the reference design.
const Shell = () => {
  const { user } = useAuth();

    <div className="flex flex-col h-screen overflow-hidden bg-bg">
      <TopBar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/" element={user ? <Dashboard /> : <LandingPage />} />
          <Route path="/upload" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/companies" element={<CompaniesShowcase />} />
          <Route path="/ats" element={<ProtectedRoute><ATSDashboard /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/resumes/:id" element={<ProtectedRoute><ResumeResultPage /></ProtectedRoute>} />
        </Routes>
      </main>
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

