import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Play,
  RotateCcw,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Users,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  ArrowRightLeft,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { DutyAssignment, Examination, Faculty, User } from '../types/index.ts';

interface DutySchedulerProps {
  currentUser: User;
  initialExamId?: string;
  onNavigateToReports?: () => void;
}

export const DutyScheduler: React.FC<DutySchedulerProps> = ({
  currentUser,
  initialExamId,
  onNavigateToReports
}) => {
  const [exams, setExams] = useState<Examination[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');

  // Options
  const [requiredPerHall, setRequiredPerHall] = useState(1);
  const [departmentSeparation, setDepartmentSeparation] = useState(true);
  const [preserveLocked, setPreserveLocked] = useState(true);

  // Scheduling State
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [confirmedDuties, setConfirmedDuties] = useState<DutyAssignment[]>([]);
  const [fairnessScore, setFairnessScore] = useState<number>(85);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Manual Reassignment Modal
  const [reassignDuty, setReassignDuty] = useState<DutyAssignment | null>(null);
  const [selectedNewFacultyId, setSelectedNewFacultyId] = useState('');
  const [reassignError, setReassignError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [examRes, facRes] = await Promise.all([
          fetch('/api/examinations'),
          fetch('/api/faculty')
        ]);
        const examData = await examRes.json();
        const facData = await facRes.json();

        setExams(examData);
        setFacultyList(facData);

        if (!selectedExamId && examData.length > 0) {
          setSelectedExamId(examData[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  // When selected exam changes, load confirmed duties
  useEffect(() => {
    if (!selectedExamId) return;
    loadExamDuties(selectedExamId);
  }, [selectedExamId]);

  const loadExamDuties = async (examId: string) => {
    setLoading(true);
    setPreviewResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/duties/by-exam/${examId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setConfirmedDuties(data);
      } else {
        setConfirmedDuties([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Run Duty Scheduling Preview
  const handleScheduleDuties = async () => {
    if (!selectedExamId) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/duties/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          options: {
            requiredPerHall,
            departmentSeparation,
            preserveLocked
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Duty scheduling failed');
        setPreviewResult(null);
      } else {
        setPreviewResult(data);
        setFairnessScore(data.fairnessScore);
        if (data.unassignedHalls && data.unassignedHalls.length > 0) {
          setErrorMessage(`Warning: ${data.unassignedHalls.length} duty slot(s) could not be assigned due to faculty constraints.`);
        } else {
          setSuccessMessage(`Optimized schedule created with ${data.assignments.length} invigilators. Review below.`);
        }
      }
    } catch (err) {
      setErrorMessage('Server error while scheduling faculty duties.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Duty Schedule
  const handleConfirmDuties = async () => {
    if (!selectedExamId || !previewResult) return;

    setLoading(true);
    try {
      const res = await fetch('/api/duties/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          assignments: previewResult.assignments,
          currentUser: currentUser.name
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save duties.');
      } else {
        setSuccessMessage('Faculty invigilation duties confirmed and published.');
        setPreviewResult(null);
        await loadExamDuties(selectedExamId);
      }
    } catch (err) {
      setErrorMessage('Server error saving duties.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Lock
  const toggleDutyLock = async (dutyId: string, currentLocked: number) => {
    try {
      await fetch(`/api/duties/${dutyId}/lock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_locked: currentLocked === 1 ? 0 : 1 })
      });
      loadExamDuties(selectedExamId);
    } catch (err) {
      console.error(err);
    }
  };

  // Manual Reassignment Submit
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignDuty || !selectedNewFacultyId) return;

    setReassignError(null);
    try {
      const res = await fetch('/api/duties/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dutyId: reassignDuty.id,
          newFacultyId: selectedNewFacultyId,
          currentUser: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setReassignError(data.error || 'Reassignment rejected.');
      } else {
        setReassignDuty(null);
        setSelectedNewFacultyId('');
        setSuccessMessage('Duty reassigned successfully.');
        loadExamDuties(selectedExamId);
      }
    } catch (err) {
      setReassignError('Server error while reassigning duty.');
    }
  };

  const currentExam = exams.find(e => e.id === selectedExamId);
  const activeDuties = previewResult ? previewResult.assignments : confirmedDuties;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-600" />
            <span>Automatic Faculty Invigilation Duty Scheduler</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fair constraint-satisfaction scheduling with double-booking prevention, daily caps, and lock support.
          </p>
        </div>

        {activeDuties.length > 0 && onNavigateToReports && (
          <button
            onClick={onNavigateToReports}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>Download Duty Roster</span>
          </button>
        )}
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        
        {/* Exam Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  [{ex.exam_code}] {ex.exam_name} — {ex.subject_code} ({ex.exam_date} {ex.session_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Examination Session
            </label>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
              <span className="font-semibold">{currentExam?.exam_date}</span>
              <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-sky-100 text-sky-800">
                {currentExam?.session_name} ({currentExam?.start_time} - {currentExam?.end_time})
              </span>
            </div>
          </div>
        </div>

        {/* Algorithm Constraints & Controls */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="font-bold text-slate-900 block mb-1">Invigilators Per Hall</label>
            <select
              value={requiredPerHall}
              onChange={(e) => setRequiredPerHall(Number(e.target.value))}
              className="w-full text-xs p-1.5 rounded-md border border-slate-200 bg-white"
            >
              <option value={1}>1 Invigilator per Hall (Standard)</option>
              <option value={2}>2 Invigilators per Hall (Large halls & audits)</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Halls &gt; 35 desks automatically get 2 invigilators.
            </span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="dutyDeptSep"
              checked={departmentSeparation}
              onChange={(e) => setDepartmentSeparation(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
            />
            <div>
              <label htmlFor="dutyDeptSep" className="font-bold text-slate-900 cursor-pointer block">
                Department Neutrality Rule
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Avoids assigning faculty to their own department's single-subject examination.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="preserveLock"
              checked={preserveLocked}
              onChange={(e) => setPreserveLocked(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
            />
            <div>
              <label htmlFor="preserveLock" className="font-bold text-slate-900 cursor-pointer block">
                Preserve Locked Assignments
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Keeps manually designated Chief Invigilators or locked duties intact.
              </p>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleScheduleDuties}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Optimizing Duty Matrix...' : 'Auto-Assign Invigilators'}</span>
            </button>

            {previewResult && (
              <button
                onClick={handleConfirmDuties}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Publish Roster</span>
              </button>
            )}
          </div>

          {/* Fairness Score Meter */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <Scale className="w-4 h-4 text-sky-600" />
            <div className="text-xs">
              <span className="text-slate-500">Fairness Index:</span>{' '}
              <strong className="text-slate-900">{fairnessScore}%</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Warnings & Unassigned Halls Notice */}
      {previewResult?.unassignedHalls && previewResult.unassignedHalls.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Unassigned Duty Slots Warning ({previewResult.unassignedHalls.length})</span>
          </div>
          <p className="text-amber-800">
            The automated scheduler never silently leaves a hall unattended. The following slots could not be filled:
          </p>
          <div className="divide-y divide-amber-200 bg-white/70 rounded-lg p-2 border border-amber-200">
            {previewResult.unassignedHalls.map((u: any, idx: number) => (
              <div key={idx} className="py-1.5 flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  {u.hall_name} ({u.hall_code}) — Slot {u.slot_index} ({u.duty_type})
                </span>
                <span className="text-rose-700 font-medium">Reason: {u.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Invigilation Roster Table */}
      {activeDuties.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Invigilation Duty Assignments ({activeDuties.length} Assigned)
              </h3>
              <p className="text-xs text-slate-500">
                {previewResult ? 'Preview Mode — review before publishing' : 'Published & Confirmed Roster'}
              </p>
            </div>

            <span className="text-xs font-mono font-semibold text-slate-500">
              {previewResult ? 'SIMULATION' : 'OFFICIAL ROSTER'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Hall Venue</th>
                  <th className="px-4 py-3 text-left">Invigilator Name</th>
                  <th className="px-4 py-3 text-left">Faculty ID</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Designated Role</th>
                  <th className="px-4 py-3 text-left">Reporting Time</th>
                  <th className="px-4 py-3 text-left">Duty Lock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activeDuties.map((d: any) => {
                  const isLocked = d.is_locked === 1;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {d.hall_name || d.hall_code}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {d.faculty_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-sky-700">
                        {d.faculty_code || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {d.faculty_dept}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          d.duty_type === 'Chief Invigilator'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {d.duty_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                        {d.reporting_time}
                      </td>
                      <td className="px-4 py-3">
                        {!previewResult && (
                          <button
                            onClick={() => toggleDutyLock(d.id, d.is_locked)}
                            className={`p-1.5 rounded-lg border flex items-center gap-1 text-[11px] ${
                              isLocked
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700'
                            }`}
                            title={isLocked ? 'Duty is locked' : 'Click to lock duty'}
                          >
                            {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5" />}
                            <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                          </button>
                        )}
                        {previewResult && (
                          <span className="text-[11px] text-slate-400 italic">Auto-Assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!previewResult && (
                          <button
                            onClick={() => {
                              setReassignDuty(d);
                              setSelectedNewFacultyId('');
                              setReassignError(null);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 ml-auto"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Reassign</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Reassignment Modal */}
      {reassignDuty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Reassign Examination Duty</h3>
              <button onClick={() => setReassignDuty(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="p-6 space-y-4 text-xs">
              {reassignError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{reassignError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Current Assignment</p>
                <p className="font-bold text-slate-900 text-sm">{reassignDuty.faculty_name} ({reassignDuty.faculty_dept})</p>
                <p className="text-slate-600">
                  Hall: {reassignDuty.hall_name} • Role: {reassignDuty.duty_type}
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Replacement Faculty *</label>
                <select
                  required
                  value={selectedNewFacultyId}
                  onChange={(e) => setSelectedNewFacultyId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">Choose an available faculty member...</option>
                  {facultyList
                    .filter(f => f.is_available === 1 && f.id !== reassignDuty.faculty_id)
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department}) — {f.current_duties || 0}/{f.max_duties_period} Duties
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Double-booking on the same date and session is strictly prevented.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReassignDuty(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedNewFacultyId}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
