import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { X, Menu, Home, FileSpreadsheet, GitCompareArrows, Merge, TableProperties, Settings, RefreshCw, LoaderCircle } from 'lucide-react';
import { Toast, ConfirmDialog, FormatDialog } from './components/UI';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const CleanExcel = lazy(() => import('./pages/CleanExcel'));
const CompareExcel = lazy(() => import('./pages/CompareExcel'));
const MergeExcel = lazy(() => import('./pages/MergeExcel'));
const StandaloneArrange = lazy(() => import('./pages/StandaloneArrange'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const items = [
    ['/', Home, 'Dashboard'],
    ['/clean', FileSpreadsheet, 'Edit Excel'],
    ['/compare', GitCompareArrows, 'Compare Excel'],
    ['/merge', Merge, 'Merge Excel'],
    ['/arrange', TableProperties, 'Arrange Data'],
  ];
  return (
    <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
      <div className="brand">
        <span className="brand-icon">
          <img src="/logo.png" alt="Company Logo" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
        </span>
        <span>T<br />Tool</span>
      </div>
      <nav className="nav-list">
        <p className="nav-label">WORKSPACE</p>
        {items.map(([routePath, Icon, label]) => (
          <button 
            key={routePath} 
            className={`nav-item ${path === routePath ? 'active' : ''}`} 
            onClick={() => { navigate(routePath); setMobileMenuOpen?.(false); }}
          >
            <Icon size={19} />{label}
          </button>
        ))}
        <div className="nav-rule" />
        <button 
          className={`nav-item ${path === '/settings' ? 'active' : ''}`} 
          onClick={() => { navigate('/settings'); setMobileMenuOpen?.(false); }}
        >
          <Settings size={19} />Settings
        </button>
      </nav>
      <div className="privacy-card" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
        <RefreshCw size={20} />
        <div>
          <b>Refresh Page</b>
          <span>Click to reload application</span>
        </div>
      </div>
    </aside>
  );
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '80vh' }}>
      <div className="loading" style={{ transform: 'scale(0.8)' }}><span></span><span></span><span></span><span></span><span></span></div>
      <div style={{ marginTop: '24px', color: '#1b70c9', fontWeight: 600, letterSpacing: '0.05em' }}>Loading module...</div>
    </div>
  );
}

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [formatTask, setFormatTask] = useState(null);
  const [sharedFile, setSharedFile] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(window.__cleanerToast);
    window.__cleanerToast = window.setTimeout(() => setToast(null), 3600);
  }, []);

  const askFormat = useCallback((callback) => {
    setFormatTask(() => callback);
  }, []);

  return (
    <div className="app-shell">
      <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <main className="main-panel">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clean" element={<CleanExcel notify={notify} ask={setModal} askFormat={askFormat} sharedFile={sharedFile} setSharedFile={setSharedFile} />} />
            <Route path="/compare" element={<CompareExcel notify={notify} ask={setModal} askFormat={askFormat} sharedFile={sharedFile} setSharedFile={setSharedFile} />} />
            <Route path="/merge" element={<MergeExcel notify={notify} askFormat={askFormat} sharedFile={sharedFile} setSharedFile={setSharedFile} />} />
            <Route path="/arrange" element={<StandaloneArrange notify={notify} askFormat={askFormat} setSharedFile={setSharedFile} />} />
            <Route path="/settings" element={<SettingsPage notify={notify} />} />
          </Routes>
        </Suspense>
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {modal && <ConfirmDialog {...modal} onClose={() => setModal(null)} />}
      {formatTask && <FormatDialog onConfirm={formatTask} onClose={() => setFormatTask(null)} />}
    </div>
  );
}

export default App;
