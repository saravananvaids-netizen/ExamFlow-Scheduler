import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  Award,
  Filter,
  X,
  AlertCircle
} from 'lucide-react';
import { Faculty, User } from '../types/index.ts';

interface FacultyProps {
  currentUser: User;
}

export const FacultyPage: React.FC<FacultyProps> = ({ currentUser }) => {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);

  // Form State
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState('Computer Science & Engineering');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('+91 98401 23400');
  const [formDesignation, setFormDesignation] = useState('Assistant Professor');
  const [formMaxDay, setFormMaxDay] = useState('1');
  const [formMaxPeriod, setFormMaxPeriod] = useState('6');
  const [formSpecial, setFormSpecial] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchFaculty = async () => {
    try {
      const res = await fetch('/api/faculty');
      const data = await res.json();
      setFacultyList(data);
    } catch (e) {
      console.error('Failed to load faculty:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const openAddModal = () => {
    setEditingFaculty(null);
    setFormId(`FAC-${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormDept('Computer Science & Engineering');
    setFormEmail('');
    setFormPhone('+91 98401 23400');
    setFormDesignation('Assistant Professor');
    setFormMaxDay('1');
    setFormMaxPeriod('6');
    setFormSpecial('');
    setFormAvailable(true);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (f: Faculty) => {
    setEditingFaculty(f);
    setFormId(f.faculty_id);
    setFormName(f.name);
    setFormDept(f.department);
    setFormEmail(f.email);
    setFormPhone(f.phone);
    setFormDesignation(f.designation);
    setFormMaxDay(String(f.max_duties_per_day));
    setFormMaxPeriod(String(f.max_duties_period));
    setFormSpecial(f.special_qualification || '');
    setFormAvailable(f.is_available === 1);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId.trim() || !formName.trim() || !formEmail.trim()) {
      setFormError('Faculty ID, Name, and Email are required.');
      return;
    }

    try {
      const payload = {
        faculty_id: formId.trim().toUpperCase(),
        name: formName.trim(),
        department: formDept,
        email: formEmail.trim(),
        phone: formPhone.trim(),
        designation: formDesignation,
        max_duties_per_day: Number(formMaxDay) || 1,
        max_duties_period: Number(formMaxPeriod) || 6,
        special_qualification: formSpecial.trim() || null,
        is_available: formAvailable,
        currentUser: currentUser.name
      };

      const url = editingFaculty ? `/api/faculty/${editingFaculty.id}` : '/api/faculty';
      const method = editingFaculty ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save faculty record');
        return;
      }

      setIsAddModalOpen(false);
      fetchFaculty();
    } catch (err) {
      setFormError('Server error while saving faculty.');
    }
  };

  const toggleAvailability = async (f: Faculty) => {
    const newStatus = f.is_available === 1 ? 0 : 1;
    try {
      await fetch(`/api/faculty/${f.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, is_available: newStatus, currentUser: currentUser.name })
      });
      fetchFaculty();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredFaculty = facultyList.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        f.faculty_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        f.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = !deptFilter || f.department.toLowerCase().includes(deptFilter.toLowerCase());
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-600" />
            <span>Faculty Directory & Invigilation Eligibility</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure invigilator profiles, maximum daily and periodic workload caps, and specialized roles.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by faculty name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Information Technology">Information Tech</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
          </select>
        </div>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFaculty.map((f) => {
          const isAvailable = f.is_available === 1;
          const assigned = f.current_duties || 0;
          const periodQuota = f.max_duties_period || 6;
          const quotaPercent = Math.min(100, Math.round((assigned / periodQuota) * 100));

          return (
            <div
              key={f.id}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                isAvailable ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 bg-slate-50/70 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {f.faculty_id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-2">{f.name}</h3>
                    <p className="text-xs text-sky-700 font-medium">{f.designation}</p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isAvailable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {isAvailable ? 'Available' : 'On Leave'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 font-medium">{f.department}</p>

                {/* Contact info */}
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{f.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{f.phone}</span>
                  </div>
                </div>

                {/* Workload Progress */}
                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Assigned Duties:</span>
                    <span className="font-bold text-slate-900">
                      {assigned} / {periodQuota} <span className="font-normal text-slate-400">({f.max_duties_per_day}/day max)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        quotaPercent > 80 ? 'bg-amber-500' : 'bg-sky-600'
                      }`}
                      style={{ width: `${quotaPercent}%` }}
                    ></div>
                  </div>
                </div>

                {f.special_qualification && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-2 font-medium">
                    <Award className="w-4 h-4 shrink-0 text-indigo-600" />
                    <span>{f.special_qualification}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => toggleAvailability(f)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                    isAvailable
                      ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {isAvailable ? 'Mark on Leave' : 'Mark Available'}
                </button>

                <button
                  onClick={() => openEditModal(f)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100"
                  title="Edit Faculty Record"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Faculty Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingFaculty ? 'Edit Faculty Profile' : 'Register Faculty Member'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaculty} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Faculty ID *</label>
                  <input
                    type="text"
                    required
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="e.g. FAC-CSE-05"
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Faculty Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Iyer"
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department</label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Mathematics & Basic Sciences">Mathematics & Basic Sciences</option>
                    <option value="Physics & Materials">Physics & Materials</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Designation</label>
                  <select
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="Professor & HOD">Professor & HOD</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Visiting Lecturer">Visiting Lecturer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="faculty@apexuniversity.edu"
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Duties Per Day</label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    value={formMaxDay}
                    onChange={(e) => setFormMaxDay(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-[10px] text-slate-400">Strict cap per calendar day</span>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Duties Per Period</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={formMaxPeriod}
                    onChange={(e) => setFormMaxPeriod(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-[10px] text-slate-400">Total cap for the term</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Special Qualification / Role</label>
                <input
                  type="text"
                  value={formSpecial}
                  onChange={(e) => setFormSpecial(e.target.value)}
                  placeholder="e.g. Chief Invigilator Certified, Flying Squad"
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="facAvail"
                  checked={formAvailable}
                  onChange={(e) => setFormAvailable(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="facAvail" className="text-slate-700 font-medium cursor-pointer">
                  Available for Examination Duties this Semester
                </label>
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
                  {editingFaculty ? 'Update Faculty' : 'Register Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
