import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  UserCheck,
  Building,
  Lock,
  Database
} from 'lucide-react';
import { AuditLog, User } from '../types/index.ts';

interface SettingsProps {
  currentUser: User;
  demoUsers: User[];
  onSwitchUser: (user: User) => void;
  onDataResetSuccess: () => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({
  currentUser,
  demoUsers,
  onSwitchUser,
  onDataResetSuccess
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleResetDatabase = async () => {
    try {
      const res = await fetch('/api/seed/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUser: currentUser.name })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Database reset to clean sample college dataset successfully.');
        setResetConfirmOpen(false);
        fetchLogs();
        onDataResetSuccess();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-600" />
          <span>System Administration & Audit Trail</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Role-based security accounts, institution profile, persistent SQLite state, and audit log history.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Demo Role Switcher Cards */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Active Session Role & Demo Profiles</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch between demo personas to test permission boundaries and view role-tailored workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demoUsers.map((u) => {
            const isCurrent = currentUser.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => onSwitchUser(u)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    u.role === 'admin'
                      ? 'bg-indigo-100 text-indigo-800'
                      : u.role === 'exam_cell'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {u.role === 'admin' ? 'Administrator' : u.role === 'exam_cell' ? 'Exam Cell Staff' : 'Faculty Member'}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-sky-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-slate-900 text-sm mt-2">{u.name}</h4>
                <p className="text-xs text-slate-500">{u.department || 'Examination Division'}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-1">{u.email}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Database & Storage Diagnostics */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-600" />
              <span>Persistent SQLite Database Engine</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data persists locally in <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">exam_planner.db</code> with WAL mode enabled.
            </p>
          </div>

          <button
            onClick={() => setResetConfirmOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Database to Pristine Seed</span>
          </button>
        </div>
      </div>

      {/* Audit Log Trail Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-sky-600" />
              <span>System Audit Logs & Security History</span>
            </h3>
            <p className="text-xs text-slate-500">Chronological activity record of all state mutations</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{auditLogs.length} events logged</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700 sticky top-0 shadow-2xs">
              <tr>
                <th className="px-4 py-2.5 text-left">Timestamp</th>
                <th className="px-4 py-2.5 text-left">User</th>
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-left">Action</th>
                <th className="px-4 py-2.5 text-left">Entity</th>
                <th className="px-4 py-2.5 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">No logs found.</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                      {log.user_name}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.user_role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-sky-700 text-[11px] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {log.entity}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-full bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Reset Database?</h3>
            </div>
            <p className="text-xs text-slate-600">
              This will restore all students, halls, faculty, upcoming examinations, and duty allocations back to the pristine university dataset. Any unsaved custom entries will be reset.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDatabase}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
