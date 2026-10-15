import React, { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  GraduationCap,
  CalendarDays,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent,
  Scale,
  Sparkles,
  Clock,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { StatCard } from '../components/StatCard.tsx';
import { DashboardStats, Examination, User } from '../types/index.ts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  currentUser: User;
  onNavigate: (tab: string) => void;
  onSelectExam?: (examId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  onNavigate,
  onSelectExam
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  const deptChartData = stats.departmentStats.map(d => ({
    name: d.department,
    students: d.count
  }));

  const workloadChartData = stats.facultyWorkload.slice(0, 8).map(f => ({
    name: f.name.split(' ').slice(-1)[0], // Last name or initial
    fullName: f.name,
    duties: f.assigned_duties,
    quota: f.max_duties_period
  }));

  const COLORS = ['#2563eb', '#0d9488', '#d97706', '#10b981', '#6366f1', '#ec4899'];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
                Fall 2026 Examination Period
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Updated Live
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-2">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Centralized platform for managing student examination seating allocations, anti-malpractice department separation, and fair faculty invigilation duty rosters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('allocation')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center gap-2 transition-all shadow-sm"
            >
              <span>Auto Hall Allocator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('duty-scheduler')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-2 transition-all"
            >
              <span>Duty Scheduler</span>
            </button>
          </div>
        </div>
      </div>

      {/* Capacity & Conflict Warnings Alert */}
      {stats.capacityWarnings && stats.capacityWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">Hall Capacity Alert</h4>
            <div className="mt-1 text-xs text-amber-800 space-y-1">
              {stats.capacityWarnings.map((warn, i) => (
                <p key={i}>{warn}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Core KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Students"
          value={stats.totalStudents}
          subtitle="Across CSE, ECE, MECH, IT"
          icon={Users}
          badge={{ text: 'Active Roster', variant: 'info' }}
          onClick={() => onNavigate('students')}
        />
        <StatCard
          title="Examination Halls"
          value={stats.availableHalls}
          subtitle={`${stats.maintenanceHalls} hall(s) in maintenance`}
          icon={Building2}
          badge={{ text: `${stats.totalCapacity} Total Seats`, variant: 'success' }}
          onClick={() => onNavigate('halls')}
        />
        <StatCard
          title="Available Faculty"
          value={stats.availableFaculty}
          subtitle={`${stats.totalFaculty - stats.availableFaculty} on leave/sabbatical`}
          icon={GraduationCap}
          badge={{ text: `${stats.totalDuties} Duties Set`, variant: 'neutral' }}
          onClick={() => onNavigate('faculty')}
        />
        <StatCard
          title="Fairness Workload Index"
          value={`${stats.fairnessScore}%`}
          subtitle="Standard deviation of invigilation loads"
          icon={Scale}
          badge={{ text: stats.fairnessScore > 85 ? 'Well Balanced' : 'Optimizing', variant: stats.fairnessScore > 85 ? 'success' : 'warning' }}
          onClick={() => onNavigate('duty-scheduler')}
        />
      </div>

      {/* Secondary KPI Bar: Occupancy & Action Prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Occupancy Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Allocated Hall Seats</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats.totalAllocatedSeats} <span className="text-sm font-normal text-slate-500">/ {stats.totalCapacity} seats</span>
            </div>
            <div className="w-48 bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-sky-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.hallOccupancyPercent)}%` }}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-sky-600">{stats.hallOccupancyPercent}%</span>
            <p className="text-[11px] text-slate-500">Campus Occupancy</p>
          </div>
        </div>

        {/* Pending Planning Tasks Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Upcoming Examinations</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats.upcomingExams} <span className="text-sm font-normal text-slate-500">scheduled</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {stats.draftExamsCount} examination(s) need hall allocation
            </p>
          </div>
          <button
            onClick={() => onNavigate('examinations')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          >
            View Timetable
          </button>
        </div>

        {/* Quick Reports Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Download Official Reports</div>
            <p className="text-xs text-slate-600 mt-1">
              Generate PDF seating plans, invigilator rosters, and timetable sheets.
            </p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Reports Hub</span>
          </button>
        </div>
      </div>

      {/* Visual Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Faculty Workload Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Faculty Invigilation Workload Distribution</h3>
              <p className="text-xs text-slate-500">Assigned duties vs maximum quota limits</p>
            </div>
            <span className="text-xs text-sky-600 font-medium">Fairness Index: {stats.fairnessScore}%</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [val, name === 'duties' ? 'Assigned Duties' : 'Max Quota']}
                  labelFormatter={(name: any) => `Faculty: ${name}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="duties" fill="#0284c7" radius={[4, 4, 0, 0]} name="duties" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-500 text-center mt-2">
            The automated scheduler balances duties to prevent overworked faculty.
          </div>
        </div>

        {/* Student Enrollment by Department */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Student Enrollment by Department</h3>
              <p className="text-xs text-slate-500">Distribution for anti-copying alternating seating</p>
            </div>
            <span className="text-xs text-slate-500">{stats.totalStudents} Total</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                  {deptChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-500 text-center mt-2">
            Alternating seating uses inter-departmental interleaving.
          </div>
        </div>

      </div>

      {/* Upcoming Examinations & Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Examinations Schedule List (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Upcoming Examination Schedule</h3>
              <p className="text-xs text-slate-500">Fall 2026 Midterm & End-Semester Sessions</p>
            </div>
            <button
              onClick={() => onNavigate('examinations')}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.upcomingExamsList.map((exam) => (
              <div key={exam.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-lg px-2 -mx-2 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-base font-extrabold text-slate-900 leading-none">
                      {new Date(exam.exam_date).getDate()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                        {exam.subject_code}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{exam.exam_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Time: {exam.start_time} - {exam.end_time} ({exam.session_name})</span>
                      <span>•</span>
                      <span>Depts: {exam.department}</span>
                      <span>•</span>
                      <span>Students: {exam.total_eligible_students}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center self-start">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    exam.status === 'Confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : exam.status === 'Allocated'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {exam.status}
                  </span>
                  
                  <button
                    onClick={() => {
                      if (onSelectExam) onSelectExam(exam.id);
                      onNavigate('allocation');
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
                    title="Open Allocation Plan"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Trail Activity (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Activity Log</h3>
              <p className="text-xs text-slate-500">Audit trail of administrative actions</p>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold"
            >
              All Logs
            </button>
          </div>

          <div className="space-y-3">
            {stats.recentActivity.map((log) => (
              <div key={log.id} className="text-xs pb-2 border-b border-slate-100 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{log.user_name}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5 line-clamp-2">{log.details}</p>
                <span className="inline-block mt-1 text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                  {log.action}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
