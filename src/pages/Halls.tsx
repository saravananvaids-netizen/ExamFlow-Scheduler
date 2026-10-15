import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Accessibility,
  Eye,
  X,
  Wrench,
  Grid
} from 'lucide-react';
import { Hall, User } from '../types/index.ts';
import { SeatingGrid } from '../components/SeatingGrid.tsx';

interface HallsProps {
  currentUser: User;
}

export const Halls: React.FC<HallsProps> = ({ currentUser }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [previewHall, setPreviewHall] = useState<Hall | null>(null);

  // Form
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formBuilding, setFormBuilding] = useState('Main Academic Block');
  const [formFloor, setFormFloor] = useState('1');
  const [formCapacity, setFormCapacity] = useState('24');
  const [formRows, setFormRows] = useState('4');
  const [formCols, setFormCols] = useState('6');
  const [formAccessible, setFormAccessible] = useState(true);
  const [formAvailable, setFormAvailable] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchHalls = async () => {
    try {
      const res = await fetch('/api/halls');
      const data = await res.json();
      setHalls(data);
    } catch (e) {
      console.error('Failed to fetch halls:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  const openAddModal = () => {
    setEditingHall(null);
    setFormCode('');
    setFormName('');
    setFormBuilding('Main Academic Block');
    setFormFloor('1');
    setFormCapacity('24');
    setFormRows('4');
    setFormCols('6');
    setFormAccessible(true);
    setFormAvailable(true);
    setFormNotes('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (h: Hall) => {
    setEditingHall(h);
    setFormCode(h.hall_code);
    setFormName(h.name);
    setFormBuilding(h.building);
    setFormFloor(String(h.floor));
    setFormCapacity(String(h.capacity));
    setFormRows(String(h.rows));
    setFormCols(String(h.cols));
    setFormAccessible(h.is_accessible === 1);
    setFormAvailable(h.is_available === 1);
    setFormNotes(h.maintenance_notes || '');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || !formCapacity) {
      setFormError('Hall Code, Name, and Capacity are required.');
      return;
    }

    const cap = Number(formCapacity);
    const r = Number(formRows) || 4;
    const c = Number(formCols) || 6;

    if (r * c < cap) {
      setFormError(`Grid dimensions (${r} Rows × ${c} Cols = ${r * c} seats) cannot be less than total capacity (${cap})!`);
      return;
    }

    try {
      const payload = {
        hall_code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        building: formBuilding,
        floor: Number(formFloor),
        capacity: cap,
        rows: r,
        cols: c,
        is_accessible: formAccessible,
        is_available: formAvailable,
        maintenance_notes: formNotes,
        currentUser: currentUser.name
      };

      const url = editingHall ? `/api/halls/${editingHall.id}` : '/api/halls';
      const method = editingHall ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save hall');
        return;
      }

      setIsAddModalOpen(false);
      fetchHalls();
    } catch (err) {
      setFormError('Server error while saving.');
    }
  };

  const toggleAvailability = async (hall: Hall) => {
    const newStatus = hall.is_available === 1 ? 0 : 1;
    const note = newStatus === 0 ? 'Marked unavailable for scheduled maintenance' : null;
    try {
      await fetch(`/api/halls/${hall.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newStatus, maintenance_notes: note })
      });
      fetchHalls();
    } catch (err) {
      console.error(err);
    }
  };

  // Generate blank template grid for previewing empty hall
  const createEmptyGrid = (h: Hall) => {
    const grid = [];
    for (let r = 0; r < h.rows; r++) {
      const row = [];
      for (let c = 0; c < h.cols; c++) {
        row.push({
          status: 'Vacant' as const,
          seatNumber: `${h.hall_code}-R${r + 1}C${c + 1}`,
          student: null,
          rowIndex: r,
          colIndex: c
        });
      }
      grid.push(row);
    }
    return grid;
  };

  const totalSeats = halls.reduce((sum, h) => sum + h.capacity, 0);
  const activeSeats = halls.filter(h => h.is_available === 1).reduce((sum, h) => sum + h.capacity, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            <span>Examination Hall Infrastructure</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure examination venues, desk grid layouts, accessibility features, and maintenance status.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Examination Hall</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Halls Registered</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{halls.length} Venues</div>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold">{totalSeats} Max Seats</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Active Available Halls</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">
              {halls.filter(h => h.is_available === 1).length} Available
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-semibold">
            {activeSeats} Live Seats
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Maintenance & Offline</span>
            <div className="text-xl font-bold text-amber-600 mt-1">
              {halls.filter(h => h.is_available === 0).length} Blocked
            </div>
          </div>
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded font-semibold">
            {totalSeats - activeSeats} Seats Offline
          </span>
        </div>
      </div>

      {/* Halls Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {halls.map((hall) => {
          const isAvailable = hall.is_available === 1;
          return (
            <div
              key={hall.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isAvailable ? 'border-slate-200 hover:shadow-md' : 'border-amber-200 bg-amber-50/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {hall.hall_code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hall.is_accessible === 1 && (
                      <span className="p-1 rounded bg-sky-50 text-sky-700" title="Wheelchair Accessible / Elevators Available">
                        <Accessibility className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {isAvailable ? 'Available' : 'Maintenance'}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2.5">{hall.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hall.building} • Floor {hall.floor === 0 ? 'Ground (0)' : hall.floor}
                </p>

                {/* Desk Metrics */}
                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 grid grid-cols-3 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Capacity</span>
                    <p className="font-bold text-slate-900 text-sm">{hall.capacity}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows</span>
                    <p className="font-bold text-slate-900 text-sm">{hall.rows}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Cols</span>
                    <p className="font-bold text-slate-900 text-sm">{hall.cols}</p>
                  </div>
                </div>

                {hall.maintenance_notes && (
                  <div className="mt-3 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                    <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{hall.maintenance_notes}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setPreviewHall(hall)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Seating Grid</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleAvailability(hall)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                      isAvailable
                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {isAvailable ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    onClick={() => openEditModal(hall)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100"
                    title="Edit Hall"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seating Grid Preview Modal */}
      {previewHall && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Desk Layout: {previewHall.name} ({previewHall.hall_code})
                </h3>
                <p className="text-xs text-slate-500">
                  Configured Desk Dimensions: {previewHall.rows} Rows × {previewHall.cols} Columns
                </p>
              </div>
              <button
                onClick={() => setPreviewHall(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <SeatingGrid
              hallName={previewHall.name}
              hallCode={previewHall.hall_code}
              building={previewHall.building}
              rows={previewHall.rows}
              cols={previewHall.cols}
              capacity={previewHall.capacity}
              grid={createEmptyGrid(previewHall)}
              totalOccupied={0}
            />

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewHall(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Hall Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingHall ? 'Edit Examination Hall' : 'Add Examination Hall'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHall} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hall Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. LH-205"
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hall Display Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ramanujan Hall"
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Building / Block</label>
                  <input
                    type="text"
                    value={formBuilding}
                    onChange={(e) => setFormBuilding(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Floor Number</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Capacity *</label>
                  <input
                    type="number"
                    min={4}
                    max={200}
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Desk Rows</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={formRows}
                    onChange={(e) => setFormRows(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Desk Cols</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={formCols}
                    onChange={(e) => setFormCols(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAccessible}
                    onChange={(e) => setFormAccessible(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-slate-700 font-medium">Wheelchair Accessible</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-slate-700 font-medium">Available for Exams</span>
                </label>
              </div>

              {!formAvailable && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Maintenance / Block Reason</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Projector or air conditioning repair"
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

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
                  {editingHall ? 'Update Hall' : 'Create Hall'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
