/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Plus, Search, Settings, Users, Menu, X, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import ViewInvoice from './pages/ViewInvoice';
import SettingsPage from './pages/Settings';

import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading your profile...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const location = useLocation();
  const { logout } = useAuth();
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-blue-900 flex flex-col shrink-0 shadow-xl 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 pb-8 border-b border-blue-800 mb-4 flex justify-between items-center">
          <h1 className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-blue-900 text-xl shrink-0">S</div>
            <span className="font-bold text-white text-lg tracking-tight">Sparksfly</span>
          </h1>
          <button className="lg:hidden text-white" onClick={closeSidebar}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <Link onClick={closeSidebar} to="/" className={`flex items-center gap-3 p-3 rounded-md transition-all font-medium ${location.pathname === '/' ? 'text-white bg-blue-800' : 'text-white/60 hover:text-white hover:bg-blue-800/50'}`}>
            <Search className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </Link>
          <Link onClick={closeSidebar} to="/clients" className={`flex items-center gap-3 p-3 rounded-md transition-all font-medium ${location.pathname.startsWith('/clients') ? 'text-white bg-blue-800' : 'text-white/60 hover:text-white hover:bg-blue-800/50'}`}>
            <Users className="w-5 h-5 shrink-0" />
            <span>Clients</span>
          </Link>
          <Link onClick={closeSidebar} to="/create" className={`flex items-center gap-3 p-3 rounded-md transition-all font-medium ${location.pathname === '/create' ? 'text-white bg-blue-800' : 'text-white/60 hover:text-white hover:bg-blue-800/50'}`}>
            <Plus className="w-5 h-5 shrink-0" />
            <span>New Invoice</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-blue-800 mt-auto space-y-2">
          <Link onClick={closeSidebar} to="/settings" className={`flex items-center gap-3 p-3 rounded-md transition-all font-medium w-full text-left ${location.pathname === '/settings' ? 'text-white bg-blue-800' : 'text-white/60 hover:text-white hover:bg-blue-800/50'}`}>
            <Settings className="w-5 h-5 shrink-0" />
            <span>Settings</span>
          </Link>
          <button onClick={logout} className="flex items-center gap-3 p-3 rounded-md transition-all font-medium w-full text-left text-white/60 hover:text-red-400 hover:bg-blue-800/50">
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <main className="flex-1 flex flex-col overflow-hidden text-slate-800 w-full min-w-0">
        {/* Mobile Header Toggle */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-900 rounded flex items-center justify-center font-bold text-white text-sm">S</div>
            <span className="font-bold text-slate-900 tracking-tight">Sparksfly</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 flex items-center justify-center rounded-md">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-h-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetails />} />
            <Route path="/create" element={<CreateInvoice />} />
            <Route path="/invoices/:id" element={<ViewInvoice />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
