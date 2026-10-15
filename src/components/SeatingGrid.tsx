import React, { useState } from 'react';
import { User, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

interface DeskCell {
  status: 'Occupied' | 'Vacant' | 'Reserved';
  seatNumber: string;
  student?: {
    id: string;
    name: string;
    reg_no: string;
    department: string;
    email?: string;
  } | null;
  rowIndex: number;
  colIndex: number;
}

interface SeatingGridProps {
  hallName: string;
  hallCode: string;
  building: string;
  rows: number;
  cols: number;
  capacity: number;
  grid: DeskCell[][];
  totalOccupied?: number;
}

export const SeatingGrid: React.FC<SeatingGridProps> = ({
  hallName,
  hallCode,
  building,
  rows,
  cols,
  capacity,
  grid,
  totalOccupied = 0
}) => {
  const [selectedDesk, setSelectedDesk] = useState<DeskCell | null>(null);

  // Department color palette for alternating department visual differentiation
  const getDeptColor = (dept?: string) => {
    if (!dept) return 'bg-slate-100 text-slate-700 border-slate-200';
    const d = dept.toUpperCase();
    if (d.includes('CSE')) return 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:border-indigo-400';
    if (d.includes('IT')) return 'bg-teal-50 border-teal-200 text-teal-700 hover:border-teal-400';
    if (d.includes('ECE')) return 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400';
    if (d.includes('MECH')) return 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-400';
    if (d.includes('CIVIL')) return 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:border-cyan-400';
    return 'bg-purple-50 border-purple-200 text-purple-700 hover:border-purple-400';
  };

  const getDeptPill = (dept?: string) => {
    if (!dept) return 'bg-slate-200 text-slate-800';
    const d = dept.toUpperCase();
    if (d.includes('CSE')) return 'bg-indigo-600 text-white';
    if (d.includes('IT')) return 'bg-teal-600 text-white';
    if (d.includes('ECE')) return 'bg-amber-600 text-white';
    if (d.includes('MECH')) return 'bg-emerald-600 text-white';
    return 'bg-slate-700 text-white';
  };

  const vacantCount = capacity - totalOccupied;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      {/* Hall Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-base">{hallName} ({hallCode})</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">
              {building}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dimensions: {rows} Rows × {cols} Columns | Total Capacity: {capacity} Desks
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-indigo-50 border border-indigo-300"></span>
            <span className="text-slate-600">CSE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-teal-50 border border-teal-300"></span>
            <span className="text-slate-600">IT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-50 border border-amber-300"></span>
            <span className="text-slate-600">ECE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-50 border border-dashed border-slate-300"></span>
            <span className="text-slate-500">Vacant ({vacantCount})</span>
          </div>
        </div>
      </div>

      {/* Blackboard / Invigilator Podium at front */}
      <div className="my-6">
        <div className="w-2/3 max-w-md mx-auto py-2 px-4 rounded-lg bg-slate-800 text-white text-center text-xs font-semibold uppercase tracking-wider shadow-inner flex items-center justify-center gap-2">
          <span>BLACKBOARD & INVIGILATOR PODIUM</span>
        </div>
        <div className="text-[10px] text-center text-slate-400 mt-1 uppercase font-medium">Front of Examination Hall</div>
      </div>

      {/* Interactive Desks Matrix */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max mx-auto space-y-3">
          {grid.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center gap-3 justify-center">
              {/* Row Label */}
              <div className="w-7 text-xs font-bold text-slate-400 text-right">
                R{rIdx + 1}
              </div>

              {/* Desk Cells in this Row */}
              <div className="flex items-center gap-2.5">
                {row.map((cell, cIdx) => {
                  const isOccupied = cell.status === 'Occupied' && cell.student;
                  const isSelected = selectedDesk?.seatNumber === cell.seatNumber;

                  return (
                    <div
                      key={cIdx}
                      onClick={() => setSelectedDesk(cell)}
                      className={`relative w-28 sm:w-32 h-20 rounded-lg p-2 flex flex-col justify-between transition-all duration-150 cursor-pointer text-left border ${
                        isSelected ? 'ring-2 ring-sky-500 shadow-md' : 'shadow-2xs'
                      } ${
                        isOccupied
                          ? getDeptColor(cell.student?.department)
                          : 'bg-slate-50/70 border-dashed border-slate-200 hover:border-slate-400 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold tracking-tight text-slate-600">
                          {cell.seatNumber}
                        </span>
                        {isOccupied && cell.student && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${getDeptPill(cell.student.department)}`}>
                            {cell.student.department}
                          </span>
                        )}
                      </div>

                      {isOccupied && cell.student ? (
                        <div>
                          <div className="font-semibold text-xs truncate leading-snug">
                            {cell.student.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">
                            {cell.student.reg_no}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2 text-[11px] font-medium text-slate-400 italic">
                          Vacant Desk
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Desk Inspection Drawer / Modal */}
      {selectedDesk && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Desk {selectedDesk.seatNumber}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                selectedDesk.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {selectedDesk.status}
              </span>
            </div>
            {selectedDesk.student ? (
              <p className="text-xs text-slate-600 mt-1">
                Student: <strong className="text-slate-800">{selectedDesk.student.name}</strong> (Reg No: <span className="font-mono">{selectedDesk.student.reg_no}</span>) • Dept: <strong>{selectedDesk.student.department}</strong>
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">This desk is currently unoccupied and available for extra allotment or buffer seating.</p>
            )}
          </div>
          <button
            onClick={() => setSelectedDesk(null)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
          >
            Close Inspector
          </button>
        </div>
      )}
    </div>
  );
};
