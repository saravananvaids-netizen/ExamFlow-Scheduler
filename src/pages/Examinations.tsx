import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  Clock,
  AlertCircle,
  X,
  Grid3X3,
  UserCheck,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { Examination, User } from '../types/index.ts';

interface ExaminationsProps {
  currentUser: User;
  onNavigateToAllocation: (examId: string) => void;
  onNavigateToDuty: (examId: string) => void;
}

export const Examinations: React.FC<ExaminationsProps> = ({
  currentUser,
  onNavigateToAllocation,
  onNavigateToDuty
}) => {
  const [exams, setExams] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSession, setFilterSession] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSubCode, setFormSubCode] = useState('');
  const [formSubName, setFormSubName] = useState('');
  const [formDept, setFormDept] = useState('CSE');
  const [formSem, setFormSem] = useState('5');
  const [formDate, setFormDate] = useState('2026-10-25');
  const [formStartTime, setFormStartTime] = useState('09:30');
  const [formEndTime, setFormEndTime] = useState('12:30');
  const [formSession, setFormSession] = useState<'FN' | 'AN'>('FN');
  const [formEligible, setFormEligible] = useState('25');
  const [formInvigilators, setFormInvigilators] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/examinations');
      const data = await res.json();
      setExams(data);
    } catch (e) {
      console.error('Failed to load exams:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const openAddModal = () => {
    setEditingExam(null);
    setFormCode(`EX2026-${String(exams.length + 1).padStart(2, '0')}`);
    setFormName('');
    setFormSubCode('CS501');
    setFormSubName('');
    setFormDept('CSE');
    setFormSem('5');
    setFormDate('2026-10-26');
    setFormStartTime('09:30');
    setFormEndTime('12:30');
    setFormSession('FN');
    setFormEligible('20');
    setFormInvigilators('1');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (ex: Examination) => {
    setEditingExam(ex);
    setFormCode(ex.exam_code);
    setFormName(ex.exam_name);
    setFormSubCode(ex.subject_code);
    setFormSubName(ex.subject_name);
    setFormDept(ex.department);
    setFormSem(String(ex.semester));
    setFormDate(ex.exam_date);
    setFormStartTime(ex.start_time);
    setFormEndTime(ex.end_time);
    setFormSession(ex.session_name);
    setFormEligible(String(ex.total_eligible_students));
    setFormInvigilators(String(ex.required_invigilators_per_hall));
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || !formSubCode.trim() || !formDate) {
      setFormError('Exam Code, Name, Subject Code, and Date are mandatory.');
      return;
    }

    try {
      const payload = {
        exam_code: formCode.trim().toUpperCase(),
        exam_name: formName.trim(),
        subject_code: formSubCode.trim().toUpperCase(),
        subject_name: formSubName.trim() || formName.trim(),
        department: formDept,
        semester: Number(formSem),
        exam_date: formDate,
        start_time: formStartTime,
        end_time: formEndTime,
        session_name: formSession,
        total_eligible_students: Number(formEligible) || 0,
        required_invigilators_per_hall: Number(formInvigilators) || 1,
        currentUser: currentUser.name
      };

      const url = editingExam ? `/api/examinations/${editingExam.id}` : '/api/examinations';
      const method = editingExam ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save examination schedule');
        return;
      }

      setIsAddModalOpen(false);
      fetchExams();
    } catch (err) {
      setFormError('Server error while saving exam.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this examination? Allocated seats and duty records will be removed.')) return;
    try {
      await fetch(`/api/examinations/${id}`, { method: 'DELETE' });
      fetchExams();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredExams = exams.filter(e => {
    const matchSession = !filterSession || e.session_name === filterSession;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSession && matchStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-sky-600" />
            <span>Campus Examination Schedule & Timetable</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinate dates, session slots (FN/AN), course codes, and invigilator requirements.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Examination</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filter by:
        </span>

        <select
          value={filterSession}
          onChange={(e) => setFilterSession(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
        >
          <option value="">All Sessions (FN & AN)</option>
          <option value="FN">Forenoon (FN - 09:30 AM)</option>
          <option value="AN">Afternoon (AN - 02:00 PM)</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft (Unallocated)</option>
          <option value="Allocated">Allocated</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Examinations Timetable Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">Exam Code</th>
                <th className="px-4 py-3 text-left">Date & Session</th>
                <th className="px-4 py-3 text-left">Subject / Course Details</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Eligible Candidates</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Planning Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading examinations...</td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No examinations found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredExams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{ex.exam_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {new Date(ex.exam_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                          ex.session_name === 'FN' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {ex.session_name}
                        </span>
                        <span>{ex.start_time} - {ex.end_time}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-sky-700">{ex.subject_code}</span>
                        <span>— {ex.subject_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{ex.exam_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">{ex.department}</span>
                      <div className="text-[10px] text-slate-400">Sem {ex.semester}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{ex.total_eligible_students} Candidates</div>
                      <div className="text-[10px] text-slate-500">
                        {ex.allocated_count ? `${ex.allocated_count} seats allocated` : 'Not allocated yet'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        ex.status === 'Confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ex.status === 'Allocated'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {ex.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onNavigateToAllocation(ex.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1"
                          title="Generate or View Hall Seating"
                        >
                          <Grid3X3 className="w-3.5 h-3.5" />
                          <span>Seating Plan</span>
                        </button>

                        <button
                          onClick={() => onNavigateToDuty(ex.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1"
                          title="Assign Invigilators"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Invigilators</span>
                        </button>

                        <button
                          onClick={() => openEditModal(ex)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(ex.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Exam Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingExam ? 'Edit Examination' : 'Schedule New Examination'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Exam Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. EX2026-05"
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={formSubCode}
                    onChange={(e) => setFormSubCode(e.target.value)}
                    placeholder="e.g. CS403"
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Examination Title *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Fall Midterm: Advanced Algorithms"
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Department(s)</label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    placeholder="e.g. CSE, IT"
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formSem}
                    onChange={(e) => setFormSem(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Examination Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Session Slot</label>
                  <select
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="FN">Forenoon (FN)</option>
                    <option value="AN">Afternoon (AN)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expected Candidates</label>
                  <input
                    type="number"
                    min={1}
                    value={formEligible}
                    onChange={(e) => setFormEligible(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Invigilators Per Hall</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={formInvigilators}
                    onChange={(e) => setFormInvigilators(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs"
                >
                  {editingExam ? 'Update Examination' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
