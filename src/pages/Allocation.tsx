import React, { useState, useEffect } from 'react';
import {
  Grid3X3,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Eye,
  Sliders,
  Sparkles,
  Download,
  Shuffle,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Examination, Hall, StudentAllocation, User } from '../types/index.ts';
import { SeatingGrid } from '../components/SeatingGrid.tsx';

interface AllocationPageProps {
  currentUser: User;
  initialExamId?: string;
  onNavigateToDuty?: (examId: string) => void;
}

export const AllocationPage: React.FC<AllocationPageProps> = ({
  currentUser,
  initialExamId,
  onNavigateToDuty
}) => {
  const [exams, setExams] = useState<Examination[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');
  const [selectedHallIds, setSelectedHallIds] = useState<string[]>([]);
  
  // Algorithm Options
  const [departmentSeparation, setDepartmentSeparation] = useState(true);
  const [sortBy, setSortBy] = useState<'reg_no_asc' | 'reg_no_desc' | 'name_asc'>('reg_no_asc');
  const [regNoStart, setRegNoStart] = useState('');
  const [regNoEnd, setRegNoEnd] = useState('');

  // Execution State
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [confirmedAllocations, setConfirmedAllocations] = useState<any[]>([]);
  const [hallSummaries, setHallSummaries] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active View Tab: 'summary' | 'grid' | 'table'
  const [activeViewTab, setActiveViewTab] = useState<'summary' | 'grid' | 'table'>('summary');
  const [activeHallForGrid, setActiveHallForGrid] = useState<string>('');
  const [gridData, setGridData] = useState<any | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [examRes, hallRes] = await Promise.all([
          fetch('/api/examinations'),
          fetch('/api/halls')
        ]);
        const examData = await examRes.json();
        const hallData = await hallRes.json();

        setExams(examData);
        setHalls(hallData);

        if (!selectedExamId && examData.length > 0) {
          setSelectedExamId(examData[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  // When selected exam changes, load any existing confirmed allocations
  useEffect(() => {
    if (!selectedExamId) return;
    loadExamAllocations(selectedExamId);
  }, [selectedExamId]);

  const loadExamAllocations = async (examId: string) => {
    setLoading(true);
    setPreviewResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/allocations/by-exam/${examId}`);
      const data = await res.json();
      if (data.allocations && data.allocations.length > 0) {
        setConfirmedAllocations(data.allocations);
        setHallSummaries(data.halls || []);
        if (data.halls.length > 0 && !activeHallForGrid) {
          setActiveHallForGrid(data.halls[0].hall_id);
        }
      } else {
        setConfirmedAllocations([]);
        setHallSummaries([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch 2D grid matrix when active hall is selected
  useEffect(() => {
    if (!selectedExamId || !activeHallForGrid) return;
    async function loadHallGrid() {
      try {
        const res = await fetch(`/api/allocations/hall-seating/${selectedExamId}/${activeHallForGrid}`);
        const data = await res.json();
        if (res.ok) {
          setGridData(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadHallGrid();
  }, [selectedExamId, activeHallForGrid, confirmedAllocations]);

  // Run allocation preview
  const handleRunAllocation = async () => {
    if (!selectedExamId) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/allocations/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          options: {
            hallIds: selectedHallIds.length > 0 ? selectedHallIds : undefined,
            departmentSeparation,
            sortBy,
            regNoRangeStart: regNoStart.trim() || undefined,
            regNoRangeEnd: regNoEnd.trim() || undefined
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Allocation failed');
        setPreviewResult(null);
      } else {
        setPreviewResult(data);
        setSuccessMessage(`Simulated seating plan for ${data.stats.totalAllocated} students. Review below before saving.`);
      }
    } catch (err) {
      setErrorMessage('Server connection error while generating seating allocation.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm and persist to SQLite
  const handleConfirmAllocation = async () => {
    if (!selectedExamId || !previewResult) return;

    setLoading(true);
    try {
      const res = await fetch('/api/allocations/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          allocations: previewResult.allocations,
          currentUser: currentUser.name
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save allocation.');
      } else {
        setSuccessMessage('Seating allocation confirmed and locked in database.');
        setPreviewResult(null);
        await loadExamAllocations(selectedExamId);
      }
    } catch (err) {
      setErrorMessage('Server error confirming allocation.');
    } finally {
      setLoading(false);
    }
  };

  // Clear allocation
  const handleClearAllocation = async () => {
    if (!selectedExamId) return;
    if (!confirm('Are you sure you want to clear this examination seating allocation?')) return;

    setLoading(true);
    try {
      await fetch(`/api/allocations/by-exam/${selectedExamId}?currentUser=${encodeURIComponent(currentUser.name)}`, {
        method: 'DELETE'
      });
      setConfirmedAllocations([]);
      setHallSummaries([]);
      setPreviewResult(null);
      setSuccessMessage('Allocation cleared. You can now regenerate.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentExam = exams.find(e => e.id === selectedExamId);
  const activeAllocations = previewResult ? previewResult.allocations : confirmedAllocations;
  const isViewingConfirmed = !previewResult && confirmedAllocations.length > 0;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-sky-600" />
            <span>Automatic Student Hall Allocation Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Optimize candidate hall placement with anti-malpractice department separation and seat matrix generation.
          </p>
        </div>

        {isViewingConfirmed && onNavigateToDuty && (
          <button
            onClick={() => onNavigateToDuty(selectedExamId)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
          >
            <span>Assign Faculty Invigilators</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Control Panel: Exam & Configuration Options */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        
        {/* Exam Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Target Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  [{ex.exam_code}] {ex.exam_name} — {ex.subject_code} ({ex.exam_date} {ex.session_name}) [{ex.status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Eligible Candidates
            </label>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>{currentExam?.total_eligible_students || 0} Students</span>
              <span className="text-[10px] uppercase font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                Dept: {currentExam?.department}
              </span>
            </div>
          </div>
        </div>

        {/* Algorithm Settings & Separation Toggles */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Department Separation */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="deptSep"
              checked={departmentSeparation}
              onChange={(e) => setDepartmentSeparation(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
            />
            <div>
              <label htmlFor="deptSep" className="font-bold text-slate-900 cursor-pointer block">
                Department Separation
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Alternates departments across adjacent desks to prevent malpractice.
              </p>
            </div>
          </div>

          {/* Student Sorting Order */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="font-bold text-slate-900 block mb-1">Seating Order Strategy</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs p-1.5 rounded-md border border-slate-200 bg-white"
            >
              <option value="reg_no_asc">Register Number (Ascending)</option>
              <option value="reg_no_desc">Register Number (Descending)</option>
              <option value="name_asc">Candidate Name (Alphabetical)</option>
            </select>
          </div>

          {/* Hall Scope Selection */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="font-bold text-slate-900 block mb-1">Venue Allocation Mode</label>
            <p className="text-[11px] text-slate-500">
              Allocates across active campus halls sorted by highest capacity first.
            </p>
            <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              {halls.filter(h => h.is_available === 1).length} Available Halls Ready
            </span>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAllocation}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Calculating Plan...' : 'Generate Smart Seating Plan'}</span>
            </button>

            {previewResult && (
              <button
                onClick={handleConfirmAllocation}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Lock Allocation</span>
              </button>
            )}
          </div>

          {confirmedAllocations.length > 0 && !previewResult && (
            <button
              onClick={handleClearAllocation}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset & Reallocate</span>
            </button>
          )}
        </div>

      </div>

      {/* Error & Warning Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-rose-900">Allocation Error</h4>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Allocation Summary & Results Section */}
      {(previewResult || confirmedAllocations.length > 0) && (
        <div className="space-y-4">
          
          {/* Navigation Tabs for Results */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveViewTab('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeViewTab === 'summary'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Halls Breakdown
              </button>
              <button
                onClick={() => setActiveViewTab('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeViewTab === 'grid'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Visual Seating Chart
              </button>
              <button
                onClick={() => setActiveViewTab('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeViewTab === 'table'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Full Candidate Manifest ({activeAllocations.length})
              </button>
            </div>

            <span className="text-xs font-mono font-semibold text-slate-500">
              {previewResult ? 'PREVIEW MODE (Uncommitted)' : 'CONFIRMED ALLOCATION'}
            </span>
          </div>

          {/* View Tab 1: Hall Breakdown Cards */}
          {activeViewTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(previewResult?.hallBreakdown || hallSummaries).map((h: any) => {
                const allocated = h.allocatedCount || h.students?.length || 0;
                const capacity = h.capacity;
                const vacant = capacity - allocated;
                const occPercent = Math.round((allocated / capacity) * 100);

                return (
                  <div key={h.hall_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                          {h.hall_code}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{occPercent}% Occupied</span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base mt-2">{h.hall_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {h.rows} Rows × {h.cols} Cols • Total Desks: {capacity}
                      </p>

                      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 grid grid-cols-2 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Allocated</span>
                          <p className="font-bold text-emerald-700 text-base">{allocated}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Vacant Desks</span>
                          <p className="font-bold text-slate-600 text-base">{vacant}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveHallForGrid(h.hall_id);
                          setActiveViewTab('grid');
                        }}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Seating Grid</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View Tab 2: Visual 2D Seating Chart */}
          {activeViewTab === 'grid' && (
            <div className="space-y-4">
              {/* Hall Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(previewResult?.hallBreakdown || hallSummaries).map((h: any) => (
                  <button
                    key={h.hall_id}
                    onClick={() => setActiveHallForGrid(h.hall_id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      activeHallForGrid === h.hall_id
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {h.hall_name} ({h.hall_code})
                  </button>
                ))}
              </div>

              {gridData && gridData.grid ? (
                <SeatingGrid
                  hallName={gridData.hall.name}
                  hallCode={gridData.hall.hall_code}
                  building={gridData.hall.building}
                  rows={gridData.hall.rows}
                  cols={gridData.hall.cols}
                  capacity={gridData.capacity}
                  grid={gridData.grid}
                  totalOccupied={gridData.totalAllocated}
                />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                  Loading seating map for selected hall...
                </div>
              )}
            </div>
          )}

          {/* View Tab 3: Full Candidate Manifest */}
          {activeViewTab === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Desk Number</th>
                      <th className="px-4 py-3 text-left">Hall</th>
                      <th className="px-4 py-3 text-left">Register Number</th>
                      <th className="px-4 py-3 text-left">Candidate Name</th>
                      <th className="px-4 py-3 text-left">Department</th>
                      <th className="px-4 py-3 text-left">Row / Col</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {activeAllocations.map((a: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{a.seat_number}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{a.hall_name || a.hall_code}</td>
                        <td className="px-4 py-2.5 font-mono text-sky-700 font-semibold">{a.reg_no}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{a.student_name}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {a.department}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                          R{a.row_index + 1} - C{a.col_index + 1}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
