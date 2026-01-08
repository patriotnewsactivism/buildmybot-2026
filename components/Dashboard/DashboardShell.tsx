/**
 * Dashboard Shell Component
 * Shared layout for all dashboard experiences with navigation and impersonation banner
 */

import React, { useState } from 'react';
import { useDashboardContext } from '../../hooks/useDashboardContext';
import { DASHBOARD_NAV, NavItem } from './dashboardNav';
import { UserRole } from '../../types';
import { 
  Menu, 
  X, 
  LogOut, 
  User, 
  AlertTriangle,
  Settings,
  Bell
} from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ 
  children, 
  currentPath = '/',
  onNavigate 
}) => {
  const { user, isImpersonating, impersonatedUser, exitImpersonation } = useDashboardContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <div>Loading...</div>;
  }

  // Determine role and navigation
  const getRole = (): 'admin' | 'partner' | 'client' => {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.MASTER_ADMIN || user.role === UserRole.ADMIN_LEGACY;
    if (isAdmin) return 'admin';
    if (user.role === UserRole.RESELLER) return 'partner';
    return 'client';
  };

  const role = getRole();
  const navItems = DASHBOARD_NAV[role] || [];

  const handleNavClick = (item: NavItem) => {
    if (onNavigate) {
      onNavigate(item.href);
    } else {
      window.location.href = item.href;
    }
    setSidebarOpen(false);
  };

  const isActive = (item: NavItem) => {
    return currentPath === item.href || currentPath.startsWith(item.href + '/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Impersonation Banner */}
      {isImpersonating && impersonatedUser && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">
              Impersonating: {impersonatedUser.name} ({impersonatedUser.email})
            </span>
          </div>
          <button
            onClick={exitImpersonation}
            className="text-sm font-medium hover:underline flex items-center gap-1"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-slate-900">BuildMyBot</h1>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-md text-slate-600 hover:bg-slate-100 relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 rounded-md text-slate-600 hover:bg-slate-100">
                <Settings size={20} />
              </button>
              <div className="flex items-center gap-2">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
                    <User size={16} className="text-slate-600" />
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-slate-700">
                  {user.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
            md:translate-x-0 md:static md:inset-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            pt-16 md:pt-0
          `}
        >
          <nav className="h-full overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-100'
                      }
                    `}
                  >
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
