import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar, TopBar } from './components/common/Header';
import ATSDashboard from './pages/ATSDashboard';

// The ATS section uses the app shell (sidebar). Upload & Companies are
// top-nav-only pages, matching the reference design.
const Shell = () => {
  const { pathname } = useLocation();
  const showSidebar = pathname.startsWith('/ats');

    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <Route path="/upload" element={<Dashboard />} />
            <Route path="/ats" element={<ATSDashboard />} />
    </div>
  );
};

      <Shell />
  );
}

