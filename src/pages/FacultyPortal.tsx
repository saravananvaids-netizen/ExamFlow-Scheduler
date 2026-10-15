import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  Printer,
  Download,
  AlertCircle,
  Award,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { DutyAssignment, Faculty, User } from '../types/index.ts';

interface FacultyPortalProps {
  currentUser: User;
}

export const FacultyPortal: React.FC<FacultyPortalProps> = ({ currentUser }) => {
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [duties, setDuties] = useState<DutyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDutyForOrder, setSelectedDutyForOrder] = useState<DutyAssignment | null>(null);

  // If currentUser is faculty, fetch their profile by faculty_id or user.faculty_id
  const targetFacultyId = currentUser.faculty_id || 'fac-1';

  const fetchFacultyDuties = async () => {
    try {
      const res = await fetch(`/api/duties/by-faculty/${targetFacultyId}`);
      const data = await res.json();
      if (res.ok) {
        setFaculty(data.faculty);
        setDuties(data.duties);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyDuties();
  }, [targetFacultyId]);

  const handleAcknowledge = async (dutyId: string) => {
    try {
      await fetch(`/api/duties/${dutyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed', notes: 'Duty acknowledged by faculty' })
      });
      fetchFacultyDuties();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
              Faculty Invigilation Portal
            </span>
            <span className="text-xs text-slate-400">ID: {faculty?.faculty_id || 'FAC-CSE-01'}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-1.5">{faculty?.name || currentUser.name}</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {faculty?.designation} • Department of {faculty?.department}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Assigned Duties</span>
            <p className="text-xl font-bold text-white">{duties.length} <span className="text-xs font-normal text-slate-400">/ {faculty?.max_duties_period || 6} Quota</span></p>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Max Daily Limit</span>
            <p className="text-xl font-bold text-sky-400">{faculty?.max_duties_per_day || 1} <span className="text-xs font-normal text-slate-400">duty/day</span></p>
          </div>
        </div>
      </div>

      {/* Duty Orders List */}
      <div>
        <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-600" />
          <span>Assigned Examination Duties ({duties.length})</span>
        </h3>

        {duties.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No examination duties currently assigned to your profile.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {duties.map((duty) => {
              const isAcknowledged = duty.status === 'Confirmed';
              return (
                <div
                  key={duty.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                        {duty.subject_code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isAcknowledged
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {duty.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base mt-2.5">{duty.exam_name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{duty.subject_name}</p>

                    <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> Exam Date:
                        </span>
                        <strong className="text-slate-900">{duty.exam_date} ({duty.session_name})</strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Exam Hours:
                        </span>
                        <span className="text-slate-800 font-mono">{duty.start_time} - {duty.end_time}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" /> Assigned Venue:
                        </span>
                        <strong className="text-slate-900">{duty.hall_name} ({duty.hall_code})</strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-600" /> Reporting Time:
                        </span>
                        <span className="text-sky-700 font-bold">{duty.reporting_time}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Designated Role:</span>
                        <span className="font-bold text-indigo-700">{duty.duty_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedDutyForOrder(duty)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View Official Duty Order</span>
                    </button>

                    {!isAcknowledged ? (
                      <button
                        onClick={() => handleAcknowledge(duty.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        Acknowledge Duty
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Printable Official Duty Order Modal */}
      {selectedDutyForOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 space-y-6">
            
            {/* University Letterhead */}
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide">
                APEX UNIVERSITY
              </h2>
              <p className="text-xs uppercase font-semibold text-slate-600">
                OFFICE OF THE CONTROLLER OF EXAMINATIONS
              </p>
              <p className="text-[11px] text-slate-500">Main Administrative Block, Academic Campus, 2026</p>
              <div className="mt-3 inline-block font-mono text-xs font-bold bg-slate-100 px-3 py-1 rounded border border-slate-300">
                FORMAL INVIGILATION DUTY ORDER
              </div>
            </div>

            {/* Order Body */}
            <div className="text-xs text-slate-800 space-y-3 leading-relaxed">
              <p>
                <strong>Ref:</strong> COE/DUTY/2026/F{selectedDutyForOrder.id} &nbsp;|&nbsp; <strong>Date:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>

              <p>
                To:<br />
                <strong>{faculty?.name || currentUser.name}</strong> ({faculty?.faculty_id})<br />
                {faculty?.designation}, Department of {faculty?.department}
              </p>

              <p className="indent-4">
                You are hereby appointed to discharge examination duties as <strong>{selectedDutyForOrder.duty_type}</strong> for the upcoming university semester examinations as detailed below:
              </p>

              {/* Order Specs Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3 py-2 font-semibold bg-slate-50 w-1/3">Course Title</td>
                      <td className="px-3 py-2 font-bold">{selectedDutyForOrder.exam_name} ({selectedDutyForOrder.subject_code})</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold bg-slate-50">Date of Examination</td>
                      <td className="px-3 py-2">{selectedDutyForOrder.exam_date} ({selectedDutyForOrder.session_name} Session)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold bg-slate-50">Examination Hours</td>
                      <td className="px-3 py-2 font-mono">{selectedDutyForOrder.start_time} - {selectedDutyForOrder.end_time}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold bg-slate-50">Assigned Venue / Hall</td>
                      <td className="px-3 py-2 font-bold">{selectedDutyForOrder.hall_name} ({selectedDutyForOrder.hall_code}) - {selectedDutyForOrder.building}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold bg-slate-50">Mandatory Reporting Time</td>
                      <td className="px-3 py-2 text-rose-700 font-bold">{selectedDutyForOrder.reporting_time}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Special Instructions:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>Please collect answer booklets, attendance sheets, and sealed question packets 30 minutes prior to exam commencement.</li>
                  <li>Verify student hall tickets and valid college photo ID before admitting candidates.</li>
                  <li>Ensure students strictly observe assigned desk locations according to the published seating matrix.</li>
                  <li>Mobile phones and unauthorized electronic devices are strictly prohibited.</li>
                </ul>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-700">Faculty Signature / Acknowledgment</p>
                <div className="mt-8 border-t border-slate-400 w-44 pt-1 text-[11px] text-slate-500">
                  {faculty?.name}
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-slate-700">Dr. Arthur Vance</p>
                <p className="text-[11px] text-slate-500">Dean & Controller of Examinations</p>
                <div className="mt-8 border-t border-slate-400 w-44 pt-1 ml-auto text-[11px] text-slate-500">
                  Apex University Seal
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 no-print">
              <button
                onClick={() => setSelectedDutyForOrder(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Order</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
