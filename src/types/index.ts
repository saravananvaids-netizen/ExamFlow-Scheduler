export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'exam_cell' | 'faculty';
  email: string;
  department?: string;
  faculty_id?: string;
}

export interface Student {
  id: string;
  reg_no: string;
  name: string;
  department: string;
  semester: number;
  year: number;
  eligible_subjects: string; // JSON array string e.g. '["CS301", "CS403"]'
  email?: string;
  status: string;
}

export interface Hall {
  id: string;
  hall_code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  rows: number;
  cols: number;
  is_accessible: number;
  is_available: number;
  maintenance_notes?: string;
}

export interface Faculty {
  id: string;
  faculty_id: string;
  name: string;
  department: string;
  email: string;
  phone: string;
  designation: string;
  max_duties_per_day: number;
  max_duties_period: number;
  preferred_sessions: string;
  unavailable_sessions: string;
  is_available: number;
  special_qualification?: string;
  current_duties?: number;
}

export interface Examination {
  id: string;
  exam_code: string;
  exam_name: string;
  subject_code: string;
  subject_name: string;
  department: string;
  semester: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  session_name: 'FN' | 'AN';
  total_eligible_students: number;
  required_invigilators_per_hall: number;
  status: 'Draft' | 'Allocated' | 'Confirmed' | 'Completed' | 'Cancelled';
  allocated_count?: number;
  halls_count?: number;
  invigilators_count?: number;
}

export interface StudentAllocation {
  id: string;
  exam_id: string;
  hall_id: string;
  student_id: string;
  seat_number: string;
  row_index: number;
  col_index: number;
  is_confirmed: number;
  created_at: string;
  student_name?: string;
  reg_no?: string;
  department?: string;
  hall_name?: string;
  hall_code?: string;
  hall_rows?: number;
  hall_cols?: number;
  hall_capacity?: number;
}

export interface DutyAssignment {
  id: string;
  exam_id: string;
  hall_id: string;
  faculty_id: string;
  duty_type: string;
  reporting_time: string;
  status: 'Assigned' | 'Confirmed' | 'Declined' | 'Completed';
  is_locked: number;
  notes?: string;
  created_at: string;
  faculty_name?: string;
  faculty_code?: string;
  faculty_dept?: string;
  phone?: string;
  email?: string;
  hall_name?: string;
  hall_code?: string;
  building?: string;
  floor?: number;
  exam_name?: string;
  exam_code?: string;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  session_name?: string;
  subject_code?: string;
  subject_name?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_name: string;
  user_role: string;
  action: string;
  entity: string;
  entity_id?: string;
  details: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalHalls: number;
  availableHalls: number;
  maintenanceHalls: number;
  totalFaculty: number;
  availableFaculty: number;
  upcomingExams: number;
  totalDuties: number;
  totalCapacity: number;
  totalAllocatedSeats: number;
  hallOccupancyPercent: number;
  fairnessScore: number;
  facultyWorkload: Array<{
    id: string;
    name: string;
    department: string;
    max_duties_period: number;
    assigned_duties: number;
  }>;
  departmentStats: Array<{
    department: string;
    count: number;
  }>;
  upcomingExamsList: Examination[];
  recentActivity: AuditLog[];
  capacityWarnings: string[];
  draftExamsCount: number;
}
