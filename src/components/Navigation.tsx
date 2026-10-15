import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  CalendarDays,
  Grid3X3,
  UserCheck,
  FileSpreadsheet,
  Settings,
  Menu,
  X,
  ChevronDown,
  Shield,
  Briefcase,
  UserCheck2,
  Bell,
  RefreshCw
} from 'lucide-react';
import { User } from '../types/index.ts';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  onSwitchUser: (user: User) => void;
  demoUsers: User[];
  onRefreshData?: () => void;
  activeExamCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  onSwitchUser,
  demoUsers,
  onRefreshData,
  activeExamCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'exam_cell', 'faculty'] },
    { id: 'students', label: 'Students', icon: Users, roles: ['admin', 'exam_cell'] },
    { id: 'halls', label: 'Exam Halls', icon: Building2, roles: ['admin', 'exam_cell'] },
    { id: 'faculty', label: 'Faculty Directory', icon: GraduationCap, roles: ['admin', 'exam_cell'] },
    { id: 'examinations', label: 'Examinations', icon: CalendarDays, roles: ['admin', 'exam_cell'] },
    { id: 'allocation', label: 'Hall Allocation', icon: Grid3X3, roles: ['admin', 'exam_cell'] },
    { id: 'duty-scheduler', label: 'Duty Scheduler', icon: UserCheck, roles: ['admin', 'exam_cell'] },
    { id: 'faculty-portal', label: 'My Duties (Portal)', icon: Briefcase, roles: ['faculty', 'admin', 'exam_cell'] },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, roles: ['admin', 'exam_cell', 'faculty'] },
    { id: 'settings', label: 'Settings & Audit', icon: Settings, roles: ['admin', 'exam_cell'] }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  const roleLabels = {
    admin: { label: 'Administrator', badge: 'bg-indigo-900/60 text-indigo-200 border-indigo-700/50' },
    exam_cell: { label: 'Exam Cell Staff', badge: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50' },
    faculty: { label: 'Faculty Member', badge: 'bg-amber-900/60 text-amber-200 border-amber-700/50' }
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: University Logo & Name */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onTabChange('dashboard')}>
                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-inner">
                  AU
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight text-white">APEX UNIVERSITY</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      Exam Cell
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 hidden sm:block">Smart Exam Hall Planner & Duty Scheduler</p>
                </div>
              </div>
            </div>

            {/* Right: Actions, Demo Switcher, Profile */}
            <div className="flex items-center gap-3">
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  title="Refresh Data"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {/* Notification Pill */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700/60 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Fall 2026 Term</span>
                {activeExamCount > 0 && (
                  <span className="bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-medium text-[11px]">
                    {activeExamCount} Exams Active
                  </span>
                )}
              </div>

              {/* User Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-sky-600/30 border border-sky-500/40 text-sky-300 flex items-center justify-center font-semibold text-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-medium text-slate-200 leading-tight">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-400 leading-tight flex items-center gap-1">
                      <span>{roleLabels[currentUser.role]?.label}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-800 border border-slate-700 shadow-xl py-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-700/60">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Switch Demo Account</p>
                    </div>
                    {demoUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onSwitchUser(u);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-700/50 transition-colors ${
                          currentUser.id === u.id ? 'bg-slate-700/30 font-semibold text-sky-400' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div>{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.role === 'admin' ? 'Administrator' : u.role === 'exam_cell' ? 'Exam Cell Staff' : 'Faculty Member'}</div>
                        </div>
                        {currentUser.id === u.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Secondary Sub-Navbar for Desktop Links */}
      <nav className="hidden lg:block bg-slate-850 bg-slate-900/95 border-b border-slate-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-1.5 overflow-x-auto no-scrollbar">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex">
          <div className="w-72 bg-slate-900 border-r border-slate-800 h-full p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="font-bold text-white text-sm">Navigation Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs text-slate-400">
              <p className="font-semibold text-slate-300">Signed in as:</p>
              <p className="text-white mt-0.5">{currentUser.name}</p>
              <p className="text-[11px] text-sky-400">{currentUser.email}</p>
            </div>
          </div>

          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}
    </>
  );
};
