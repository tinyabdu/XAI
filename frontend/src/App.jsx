import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, FileText, ClipboardCheck, LogOut, ShieldCheck, ClipboardList, BookOpen } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import KeepAlive from './components/KeepAlive';
import PageLoader from './components/PageLoader';
import { DialogProvider } from './components/Dialogs';

const Login     = React.lazy(() => import('./pages/Login'));
const Register  = React.lazy(() => import('./pages/Register'));
const Apply     = React.lazy(() => import('./pages/Apply'));
const Status    = React.lazy(() => import('./pages/Status'));
const Admin     = React.lazy(() => import('./pages/Admin'));
const Courses   = React.lazy(() => import('./pages/Courses'));

function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('xai_role');

  useEffect(() => {
    const token = localStorage.getItem('xai_token');
    if (!token) navigate('/login', { replace: true });
  }, [navigate]);

  // Route guard: force role back to their home if they land on the wrong section.
  useEffect(() => {
    const token = localStorage.getItem('xai_token');
    if (!token) return;
    if (role !== 'admin' && location.pathname.startsWith('/admin')) {
      navigate('/apply', { replace: true });
    }
    if (role === 'admin' && (location.pathname.startsWith('/apply') || location.pathname.startsWith('/status'))) {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, role, navigate]);

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    try { await import('./services/api').then(m => m.logout()); } catch (_) {}
    localStorage.removeItem('xai_token');
    localStorage.removeItem('xai_role');
    navigate('/login', { replace: true });
  };

  const NAV = role === 'admin'
    ? [
        { to: '/admin', label: 'Dashboard & Applications', icon: ClipboardList },
        { to: '/admin/courses', label: 'Departments & Courses', icon: BookOpen },
      ]
    : [
        { to: '/apply', label: 'My Application', icon: FileText },
        { to: '/status', label: 'Admission Status', icon: ClipboardCheck },
      ];

  const ROUTES = role === 'admin'
    ? [
        { path: '/admin', Component: Admin },
        { path: '/admin/courses', Component: Courses },
      ]
    : [
        { path: '/apply', Component: Apply },
        { path: '/status', Component: Status },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight inline-flex items-center gap-2">
              <GraduationCap size={24} /> AI Admission System
            </h1>
            <p className="text-blue-300 text-xs">
              {role === 'admin' ? 'Administrator Portal' : 'Student Admission Portal'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive: act }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                      act ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 rounded text-sm font-medium text-blue-200 hover:bg-blue-800 transition-colors inline-flex items-center gap-1.5"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {ROUTES.map(({ path, Component }) => (
          <KeepAlive key={path} active={isActive(path)}>
            <Suspense fallback={<PageLoader />}>
              <Component />
            </Suspense>
          </KeepAlive>
        ))}
      </main>

      <footer className="bg-white border-t text-center text-xs text-gray-400 py-3">
        AI Admission System · Powered by Explainable Decision Rules
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DialogProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </BrowserRouter>
      </DialogProvider>
    </ErrorBoundary>
  );
}