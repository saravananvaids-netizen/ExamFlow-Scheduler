import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  Filter,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { Student, User } from '../types/index.ts';
import { ImportModal } from '../components/ImportModal.tsx';

interface StudentsProps {
  currentUser: User;
}

export const Students: React.FC<StudentsProps> = ({ currentUser }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formRegNo, setFormRegNo] = useState('');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState('CSE');
  const [formSem, setFormSem] = useState('5');
  const [formYear, setFormYear] = useState('3');
  const [formEmail, setFormEmail] = useState('');
  const [formSubjects, setFormSubjects] = useState('CS301, CS403');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedDept) params.append('department', selectedDept);
      if (selectedSem) params.append('semester', selectedSem);

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      setStudents(data);
    } catch (e) {
      console.error('Failed to fetch students:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, selectedDept, selectedSem]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormRegNo('');
    setFormName('');
    setFormDept('CSE');
    setFormSem('5');
    setFormYear('3');
    setFormEmail('');
    setFormSubjects('CS301, CS403');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setFormRegNo(s.reg_no);
    setFormName(s.name);
    setFormDept(s.department);
    setFormSem(String(s.semester));
    setFormYear(String(s.year));
    setFormEmail(s.email || '');
    try {
      const subs = JSON.parse(s.eligible_subjects || '[]');
      setFormSubjects(Array.isArray(subs) ? subs.join(', ') : s.eligible_subjects);
    } catch {
      setFormSubjects(s.eligible_subjects || '');
    }
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRegNo.trim() || !formName.trim() || !formDept.trim()) {
      setFormError('Register Number, Name, and Department are required.');
      return;
    }

    const subList = formSubjects.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const payload = {
        reg_no: formRegNo.trim().toUpperCase(),
        name: formName.trim(),
        department: formDept,
        semester: Number(formSem),
        year: Number(formYear),
        email: formEmail.trim(),
        eligible_subjects: subList,
        currentUser: currentUser.name
      };

      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save student.');
        return;
      }

      setIsAddModalOpen(false);
      fetchStudents();
    } catch (err) {
      setFormError('Server error while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/students/${id}?currentUser=${encodeURIComponent(currentUser.name)}`, {
        method: 'DELETE'
      });
      setDeleteConfirmId(null);
      fetchStudents();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const exportCSV = () => {
    const headers = ['Register Number', 'Name', 'Department', 'Semester', 'Year', 'Email', 'Eligible Subjects'];
    const rows = students.map(s => [
      s.reg_no,
      `"${s.name}"`,
      s.department,
      s.semester,
      s.year,
      s.email || '',
      `"${s.eligible_subjects}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Students_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sampleCsvExample = `reg_no,name,department,semester,year,email,eligible_subjects
2026CSE090,Vikram Singhania,CSE,5,3,vikram.s@apex.edu,"[""CS301"", ""CS403""]"
2026ECE091,Anita Sen,ECE,5,3,anita.s@apex.edu,"[""EC402""]"
2026MECH092,Girish Nair,MECH,5,3,girish.n@apex.edu,"[""ME305""]"
2026IT093,Ritu Verma,IT,5,3,ritu.v@apex.edu,"[""CS301"", ""IT302""]"`;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <span>Student Registry & Examination Eligibility</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage candidates, register numbers, department allocations, and subject eligibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-2xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, register number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="IT">IT</option>
            <option value="CIVIL">CIVIL</option>
          </select>

          <select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="3">Semester 3</option>
            <option value="5">Semester 5</option>
            <option value="7">Semester 7</option>
          </select>

          {(searchTerm || selectedDept || selectedSem) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('');
                setSelectedSem('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 px-2 py-1 font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">Reg Number</th>
                <th className="px-4 py-3 text-left">Candidate Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Sem / Year</th>
                <th className="px-4 py-3 text-left">Email Address</th>
                <th className="px-4 py-3 text-left">Eligible Exam Subjects</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading student directory...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No student records found matching your filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  let subjects: string[] = [];
                  try {
                    subjects = JSON.parse(student.eligible_subjects || '[]');
                  } catch {
                    subjects = [student.eligible_subjects];
                  }

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{student.reg_no}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                          {student.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">Sem {student.semester} (Yr {student.year})</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{student.email || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {subjects.map((sub, i) => (
                            <span key={i} className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-50 text-sky-700 border border-sky-200">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(student.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Showing {students.length} candidate record(s)</span>
          <span className="text-slate-400">Apex University Examination Registry</span>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingStudent ? 'Edit Student Record' : 'Register New Student'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Register Number *</label>
                  <input
                    type="text"
                    required
                    value={formRegNo}
                    onChange={(e) => setFormRegNo(e.target.value)}
                    placeholder="e.g. 2026CSE045"
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Aditya Saxena"
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department *</label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="IT">IT</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
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
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Academic Year</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Institutional Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="student@apex.edu"
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Eligible Subject Codes (Comma-separated)</label>
                <input
                  type="text"
                  value={formSubjects}
                  onChange={(e) => setFormSubjects(e.target.value)}
                  placeholder="e.g. CS301, CS403, MA201"
                  className="w-full p-2.5 rounded-lg border border-slate-200 font-mono focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Students will be matched to exams based on these subject codes.</p>
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
                  {editingStudent ? 'Update Student' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-full bg-rose-50 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Delete Student?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove this student? Any existing seat allocation for this student will be unassigned.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchStudents();
        }}
        title="Bulk Import Student Candidates"
        sampleColumns={['reg_no', 'name', 'department', 'semester', 'year', 'email', 'eligible_subjects']}
        sampleDataExample={sampleCsvExample}
      />

    </div>
  );
};
