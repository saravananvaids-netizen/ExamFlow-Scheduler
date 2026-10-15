import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileText,
  Building2,
  Users,
  UserCheck,
  Calendar,
  CheckCircle,
  Eye,
  Filter
} from 'lucide-react';
import { Examination, User } from '../types/index.ts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportsProps {
  currentUser: User;
}

export const Reports: React.FC<ReportsProps> = ({ currentUser }) => {
  const [exams, setExams] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [activeReportType, setActiveReportType] = useState<
    'seating_manifest' | 'duty_roster' | 'timetable' | 'workload_summary'
  >('seating_manifest');

  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadExams() {
      try {
        const res = await fetch('/api/examinations');
        const data = await res.json();
        setExams(data);
        if (data.length > 0) {
          setSelectedExamId(data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId && activeReportType !== 'timetable' && activeReportType !== 'workload_summary') return;
    loadReportContent();
  }, [selectedExamId, activeReportType]);

  const loadReportContent = async () => {
    setLoading(true);
    try {
      if (activeReportType === 'seating_manifest') {
        const res = await fetch(`/api/allocations/by-exam/${selectedExamId}`);
        const data = await res.json();
        setReportData(data.allocations || []);
      } else if (activeReportType === 'duty_roster') {
        const res = await fetch(`/api/duties/by-exam/${selectedExamId}`);
        const data = await res.json();
        setReportData(Array.isArray(data) ? data : []);
      } else if (activeReportType === 'timetable') {
        const res = await fetch('/api/examinations');
        const data = await res.json();
        setReportData(data || []);
      } else if (activeReportType === 'workload_summary') {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        setReportData(data.facultyWorkload || []);
      }
    } catch (e) {
      console.error(e);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const currentExam = exams.find(e => e.id === selectedExamId);

  // Generate Excel (.xlsx) file using XLSX library
  const downloadExcel = () => {
    let wsData: any[] = [];
    let filename = `Apex_University_Report_${activeReportType}.xlsx`;

    if (activeReportType === 'seating_manifest') {
      wsData = reportData.map((r, i) => ({
        'S.No': i + 1,
        'Hall Code': r.hall_code,
        'Desk / Seat No': r.seat_number,
        'Register Number': r.reg_no,
        'Student Name': r.student_name,
        'Department': r.department,
        'Exam Title': currentExam?.exam_name || '',
        'Subject Code': currentExam?.subject_code || '',
        'Exam Date': currentExam?.exam_date || '',
        'Session': currentExam?.session_name || ''
      }));
      filename = `Seating_Manifest_${currentExam?.exam_code || 'Exam'}.xlsx`;
    } else if (activeReportType === 'duty_roster') {
      wsData = reportData.map((r, i) => ({
        'S.No': i + 1,
        'Examination Hall': r.hall_name || r.hall_code,
        'Invigilator Name': r.faculty_name,
        'Faculty ID': r.faculty_code,
        'Department': r.faculty_dept,
        'Duty Role': r.duty_type,
        'Reporting Time': r.reporting_time,
        'Status': r.status,
        'Date': r.exam_date || currentExam?.exam_date,
        'Session': r.session_name || currentExam?.session_name
      }));
      filename = `Duty_Roster_${currentExam?.exam_code || 'Exam'}.xlsx`;
    } else if (activeReportType === 'timetable') {
      wsData = reportData.map((r, i) => ({
        'S.No': i + 1,
        'Exam Code': r.exam_code,
        'Course Title': r.exam_name,
        'Subject Code': r.subject_code,
        'Department': r.department,
        'Semester': r.semester,
        'Date': r.exam_date,
        'Session': r.session_name,
        'Time': `${r.start_time} - ${r.end_time}`,
        'Eligible Candidates': r.total_eligible_students,
        'Status': r.status
      }));
      filename = 'Apex_University_Exam_Timetable.xlsx';
    } else if (activeReportType === 'workload_summary') {
      wsData = reportData.map((r, i) => ({
        'S.No': i + 1,
        'Faculty Member': r.name,
        'Department': r.department,
        'Assigned Duties': r.assigned_duties,
        'Max Term Quota': r.max_duties_period
      }));
      filename = 'Faculty_Invigilation_Workload.xlsx';
    }

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
    XLSX.writeFile(wb, filename);
  };

  // Generate PDF report using jsPDF and autoTable
  const downloadPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');

    // Header styling
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('APEX UNIVERSITY - OFFICE OF CONTROLLER OF EXAMINATIONS', 40, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    let title = '';
    let head: string[][] = [];
    let body: any[][] = [];

    if (activeReportType === 'seating_manifest') {
      title = `OFFICIAL SEATING MANIFEST: ${currentExam?.exam_name || ''} (${currentExam?.subject_code || ''})`;
      doc.text(title, 40, 65);
      doc.text(`Date: ${currentExam?.exam_date || ''} | Session: ${currentExam?.session_name || ''} | Total Allocated: ${reportData.length}`, 40, 80);

      head = [['#', 'Hall', 'Desk No', 'Reg No', 'Student Name', 'Dept', 'Signature']];
      body = reportData.map((r, i) => [
        i + 1,
        r.hall_code,
        r.seat_number,
        r.reg_no,
        r.student_name,
        r.department,
        ''
      ]);
    } else if (activeReportType === 'duty_roster') {
      title = `FACULTY INVIGILATION DUTY ROSTER: ${currentExam?.exam_name || ''}`;
      doc.text(title, 40, 65);
      doc.text(`Date: ${currentExam?.exam_date || ''} | Session: ${currentExam?.session_name || ''}`, 40, 80);

      head = [['#', 'Hall Venue', 'Invigilator Name', 'Faculty ID', 'Department', 'Role', 'Reporting Time']];
      body = reportData.map((r, i) => [
        i + 1,
        r.hall_name || r.hall_code,
        r.faculty_name,
        r.faculty_code || '—',
        r.faculty_dept,
        r.duty_type,
        r.reporting_time
      ]);
    } else if (activeReportType === 'timetable') {
      title = 'FALL 2026 UNIVERSITY EXAMINATION MASTER TIMETABLE';
      doc.text(title, 40, 65);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 40, 80);

      head = [['Code', 'Course Title', 'Subject', 'Department', 'Date', 'Session', 'Time', 'Candidates']];
      body = reportData.map(r => [
        r.exam_code,
        r.exam_name,
        r.subject_code,
        r.department,
        r.exam_date,
        r.session_name,
        `${r.start_time} - ${r.end_time}`,
        r.total_eligible_students
      ]);
    } else {
      title = 'FACULTY INVIGILATION WORKLOAD & FAIRNESS REPORT';
      doc.text(title, 40, 65);

      head = [['#', 'Faculty Member', 'Department', 'Assigned Duties', 'Term Quota']];
      body = reportData.map((r, i) => [
        i + 1,
        r.name,
        r.department,
        r.assigned_duties,
        r.max_duties_period
      ]);
    }

    autoTable(doc, {
      startY: 95,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 }
    });

    const filename = `${activeReportType}_${Date.now()}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-600" />
            <span>Reports, Manifests & Official Exports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate printable PDF manifests, Excel spreadsheets, and official duty orders with university headers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadExcel}
            disabled={reportData.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Download Excel (.xlsx)</span>
          </button>

          <button
            onClick={downloadPDF}
            disabled={reportData.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveReportType('seating_manifest')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportType === 'seating_manifest'
              ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <Building2 className="w-5 h-5 text-sky-600 mb-2" />
          <h4 className="font-bold text-slate-900 text-xs">Hall Seating Manifest</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Student desk-by-desk seating & signature roster</p>
        </button>

        <button
          onClick={() => setActiveReportType('duty_roster')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportType === 'duty_roster'
              ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <UserCheck className="w-5 h-5 text-indigo-600 mb-2" />
          <h4 className="font-bold text-slate-900 text-xs">Invigilation Duty Roster</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Chief & hall invigilator reporting assignments</p>
        </button>

        <button
          onClick={() => setActiveReportType('timetable')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportType === 'timetable'
              ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <Calendar className="w-5 h-5 text-teal-600 mb-2" />
          <h4 className="font-bold text-slate-900 text-xs">Examination Timetable</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Master dates, sessions, subjects, and hall counts</p>
        </button>

        <button
          onClick={() => setActiveReportType('workload_summary')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportType === 'workload_summary'
              ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <Users className="w-5 h-5 text-amber-600 mb-2" />
          <h4 className="font-bold text-slate-900 text-xs">Faculty Workload Summary</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Assigned invigilation loads vs period caps</p>
        </button>
      </div>

      {/* Target Exam Filter (for Seating and Duty reports) */}
      {(activeReportType === 'seating_manifest' || activeReportType === 'duty_roster') && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full max-w-xl">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Examination:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  [{ex.exam_code}] {ex.exam_name} — {ex.subject_code} ({ex.exam_date} {ex.session_name})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500">
            {reportData.length} Records in Manifest
          </span>
        </div>
      )}

      {/* Report Document Preview Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 print:p-0 print:border-0">
        
        {/* Official College Header on Report */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">
            APEX UNIVERSITY
          </h3>
          <p className="text-xs uppercase font-semibold text-slate-600">
            OFFICE OF THE CONTROLLER OF EXAMINATIONS
          </p>
          <div className="mt-2 inline-block font-mono text-xs font-bold bg-slate-100 px-3 py-1 rounded border border-slate-300 uppercase">
            {activeReportType === 'seating_manifest' && `STUDENT SEATING MANIFEST — ${currentExam?.exam_name || ''}`}
            {activeReportType === 'duty_roster' && `INVIGILATION DUTY ROSTER — ${currentExam?.exam_name || ''}`}
            {activeReportType === 'timetable' && 'FALL 2026 SEMESTER EXAMINATION MASTER TIMETABLE'}
            {activeReportType === 'workload_summary' && 'FACULTY INVIGILATION WORKLOAD DISTRIBUTION & FAIRNESS REPORT'}
          </div>
          {currentExam && (activeReportType === 'seating_manifest' || activeReportType === 'duty_roster') && (
            <p className="text-xs text-slate-500 mt-2">
              Course Code: <strong>{currentExam.subject_code}</strong> | Date: <strong>{currentExam.exam_date}</strong> | Session: <strong>{currentExam.session_name} ({currentExam.start_time} - {currentExam.end_time})</strong>
            </p>
          )}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading report content...</div>
          ) : reportData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No data records found for this report. Confirm seating allocation or duty assignments first.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              
              {/* Seating Manifest Headers */}
              {activeReportType === 'seating_manifest' && (
                <>
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Hall</th>
                      <th className="px-3 py-2 text-left">Desk Number</th>
                      <th className="px-3 py-2 text-left">Register Number</th>
                      <th className="px-3 py-2 text-left">Candidate Name</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Booklet No.</th>
                      <th className="px-3 py-2 text-left">Candidate Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {reportData.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.hall_code}</td>
                        <td className="px-3 py-2 font-mono font-bold text-sky-700">{r.seat_number}</td>
                        <td className="px-3 py-2 font-mono font-semibold">{r.reg_no}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{r.student_name}</td>
                        <td className="px-3 py-2 font-medium">{r.department}</td>
                        <td className="px-3 py-2 border-b border-dashed border-slate-300 w-24"></td>
                        <td className="px-3 py-2 border-b border-dashed border-slate-300 w-28"></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* Duty Roster Headers */}
              {activeReportType === 'duty_roster' && (
                <>
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Assigned Hall</th>
                      <th className="px-3 py-2 text-left">Invigilator Name</th>
                      <th className="px-3 py-2 text-left">Faculty ID</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Designated Role</th>
                      <th className="px-3 py-2 text-left">Reporting Time</th>
                      <th className="px-3 py-2 text-left">Contact Phone</th>
                      <th className="px-3 py-2 text-left">Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {reportData.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.hall_name || r.hall_code}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.faculty_name}</td>
                        <td className="px-3 py-2 font-mono text-sky-700">{r.faculty_code || '—'}</td>
                        <td className="px-3 py-2 font-medium">{r.faculty_dept}</td>
                        <td className="px-3 py-2 font-bold text-indigo-700">{r.duty_type}</td>
                        <td className="px-3 py-2 font-mono font-bold text-rose-700">{r.reporting_time}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.phone || '—'}</td>
                        <td className="px-3 py-2 border-b border-dashed border-slate-300 w-24"></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* Timetable Headers */}
              {activeReportType === 'timetable' && (
                <>
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="px-3 py-2 text-left">Exam Code</th>
                      <th className="px-3 py-2 text-left">Course / Examination Title</th>
                      <th className="px-3 py-2 text-left">Subject Code</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Session</th>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Candidates</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {reportData.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold">{r.exam_code}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{r.exam_name}</td>
                        <td className="px-3 py-2 font-mono text-sky-700">{r.subject_code}</td>
                        <td className="px-3 py-2">{r.department}</td>
                        <td className="px-3 py-2 font-medium">{r.exam_date}</td>
                        <td className="px-3 py-2 font-bold">{r.session_name}</td>
                        <td className="px-3 py-2 font-mono">{r.start_time} - {r.end_time}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.total_eligible_students}</td>
                        <td className="px-3 py-2 font-semibold">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* Workload Summary Headers */}
              {activeReportType === 'workload_summary' && (
                <>
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Faculty Member</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Assigned Invigilation Duties</th>
                      <th className="px-3 py-2 text-left">Maximum Term Quota</th>
                      <th className="px-3 py-2 text-left">Quota Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {reportData.map((r, i) => {
                      const util = Math.round((r.assigned_duties / r.max_duties_period) * 100);
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{r.name}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">{r.department}</td>
                          <td className="px-3 py-2 font-bold text-sky-700">{r.assigned_duties} duties</td>
                          <td className="px-3 py-2 text-slate-600">{r.max_duties_period} max</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              util > 80 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {util}% Capacity
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}

            </table>
          )}
        </div>

        {/* Report Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Apex University Examination Automation Suite</span>
          <span>Verified by Controller of Examinations</span>
        </div>

      </div>

    </div>
  );
};
