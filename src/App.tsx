import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Students } from './pages/Students.tsx';
import { Halls } from './pages/Halls.tsx';
import { FacultyPage } from './pages/Faculty.tsx';
import { Examinations } from './pages/Examinations.tsx';
import { AllocationPage } from './pages/Allocation.tsx';
import { DutyScheduler } from './pages/DutyScheduler.tsx';
import { FacultyPortal } from './pages/FacultyPortal.tsx';
import { Reports } from './pages/Reports.tsx';
import { SettingsPage } from './pages/Settings.tsx';
import { User } from './types/index.ts';

const DEFAULT_DEMO_USERS: User[] = [
  {
    id: 'usr-1',
    username: 'admin',
    name: 'Dr. Arthur Vance',
    role: 'admin',
    email: 'admin@apexuniversity.edu',
    department: 'Dean of Examinations'
  },
  {
    id: 'usr-2',
    username: 'exam_cell',
    name: 'Ms. Priya Sharma',
    role: 'exam_cell',
    email: 'priya.exam@apexuniversity.edu',
    department: 'Controller of Examinations'
  },
  {
    id: 'usr-3',
    username: 'faculty',
    name: 'Dr. Rajesh Kumar',
    role: 'faculty',
    email: 'rajesh.kumar@apexuniversity.edu',
    department: 'Computer Science & Engineering',
    faculty_id: 'FAC-CSE-01'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_DEMO_USERS[0]);
  const [demoUsers, setDemoUsers] = useState<User[]>(DEFAULT_DEMO_USERS);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedExamForAllocation, setSelectedExamForAllocation] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch demo accounts from backend
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/auth/demo-users');
        if (res.ok) {
          const users = await res.json();
          if (Array.isArray(users) && users.length > 0) {
            setDemoUsers(users);
          }
        }
      } catch (err) {
        console.error('Failed to load demo accounts:', err);
      }
    }
    fetchUsers();
  }, [refreshTrigger]);

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    // If switched to faculty member, navigate to their personal duty portal
    if (user.role === 'faculty') {
      setCurrentTab('faculty-portal');
    }
  };

  const navigateToAllocationWithExam = (examId: string) => {
    setSelectedExamForAllocation(examId);
    setCurrentTab('allocation');
  };

  const navigateToDutyWithExam = (examId: string) => {
    setSelectedExamForAllocation(examId);
    setCurrentTab('duty-scheduler');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-sky-500 selection:text-white">
      {/* Top and Sub Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        demoUsers={demoUsers}
        onRefreshData={() => setRefreshTrigger((prev) => prev + 1)}
        activeExamCount={4}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            onNavigate={setCurrentTab}
            onSelectExam={navigateToAllocationWithExam}
          />
        )}

        {currentTab === 'students' && (
          <Students currentUser={currentUser} />
        )}

        {currentTab === 'halls' && (
          <Halls currentUser={currentUser} />
        )}

        {currentTab === 'faculty' && (
          <FacultyPage currentUser={currentUser} />
        )}

        {currentTab === 'examinations' && (
          <Examinations
            currentUser={currentUser}
            onNavigateToAllocation={navigateToAllocationWithExam}
            onNavigateToDuty={navigateToDutyWithExam}
          />
        )}

        {currentTab === 'allocation' && (
          <AllocationPage
            currentUser={currentUser}
            initialExamId={selectedExamForAllocation}
            onNavigateToDuty={navigateToDutyWithExam}
          />
        )}

        {currentTab === 'duty-scheduler' && (
          <DutyScheduler
            currentUser={currentUser}
            initialExamId={selectedExamForAllocation}
            onNavigateToReports={() => setCurrentTab('reports')}
          />
        )}

        {currentTab === 'faculty-portal' && (
          <FacultyPortal currentUser={currentUser} />
        )}

        {currentTab === 'reports' && (
          <Reports currentUser={currentUser} />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            currentUser={currentUser}
            demoUsers={demoUsers}
            onSwitchUser={handleSwitchUser}
            onDataResetSuccess={() => setRefreshTrigger((prev) => prev + 1)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">APEX UNIVERSITY</span>
            <span>•</span>
            <span>Smart Exam Hall Planner & Faculty Duty Scheduler</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Fall 2026 Examination Term</span>
            <span>•</span>
            <span>SQLite Embedded Database (WAL Mode)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
