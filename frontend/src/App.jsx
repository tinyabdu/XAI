import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Activity, Brain, FileText, ShieldCheck, Database, HeartPulse, ClipboardCheck } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import KeepAlive from './components/KeepAlive';
import PageLoader from './components/PageLoader';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Events    = React.lazy(() => import('./pages/Events'));
const Predict   = React.lazy(() => import('./pages/Predict'));
const Report    = React.lazy(() => import('./pages/Report'));
const Logs      = React.lazy(() => import('./pages/Logs'));
const Login     = React.lazy(() => import('./pages/Login'));
const Actions   = React.lazy(() => import('./pages/Actions'));

const NAV = [
  { to: '/',        label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/events',  label: 'Live Events',     icon: Activity },
  { to: '/predict', label: 'Predict',         icon: Brain },
  { to: '/report',  label: 'Handover Report', icon: FileText },
  { to: '/logs',    label: 'Event Logs',      icon: Database },
  { to: '/actions', label: 'Actions',         icon: ClipboardCheck },
];

const ROUTES = [
  { path: '/',        Component: Dashboard, exact: true },
  { path: '/events',  Component: Events },
  { path: '/predict', Component: Predict },
  { path: '/report',  Component: Report },
  { path: '/logs',    Component: Logs },
  { path: '/actions', Component: Actions },
];

function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('xai_token');
    if (!token) navigate('/login', { replace: true });
  }, [navigate]);

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight inline-flex items-center gap-2"><ShieldCheck size={22} /> XAI Admin Monitor</h1>
            <p className="text-blue-300 text-xs">Explainable AI Website Security Dashboard</p>
          </div>
          <nav className="flex gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                    isActive ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {ROUTES.map(({ path, Component, exact }) => (
          <KeepAlive key={path} active={isActive(path, exact)}>
            <Suspense fallback={<PageLoader />}>
              <Component />
            </Suspense>
          </KeepAlive>
        ))}
      </main>

      <footer className="bg-white border-t text-center text-xs text-gray-400 py-3">
        XAI Admin Monitor
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <Suspense fallback={<PageLoader />}><Login /></Suspense>
          } />
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
