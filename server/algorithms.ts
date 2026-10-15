import { db } from './db.js';

export interface AllocationOptions {
  hallIds?: string[];
  departmentSeparation?: boolean;
  sortBy?: 'reg_no_asc' | 'reg_no_desc' | 'name_asc';
  regNoRangeStart?: string;
  regNoRangeEnd?: string;
  studentIds?: string[];
}

export interface StudentAllocationResult {
  success: boolean;
  message?: string;
  error?: string;
  stats?: {
    totalEligible: number;
    totalAllocated: number;
    totalHallsUsed: number;
    totalCapacityUsed: number;
    totalCapacityAvailable: number;
    occupancyRate: number;
  };
  allocations?: Array<{
    id: string;
    student_id: string;
    student_name: string;
    reg_no: string;
    department: string;
    hall_id: string;
    hall_name: string;
    hall_code: string;
    seat_number: string;
    row_index: number;
    col_index: number;
  }>;
  hallBreakdown?: Array<{
    hall_id: string;
    hall_code: string;
    hall_name: string;
    capacity: number;
    rows: number;
    cols: number;
    allocatedCount: number;
    vacantSeats: number;
    departments: Record<string, number>;
  }>;
}

export interface DutyAssignmentOptions {
  requiredPerHall?: number;
  departmentSeparation?: boolean;
  preserveLocked?: boolean;
}

export interface DutySchedulingResult {
  success: boolean;
  message?: string;
  error?: string;
  fairnessScore: number;
  assignments: Array<{
    id: string;
    exam_id: string;
    hall_id: string;
    hall_code: string;
    hall_name: string;
    faculty_id: string;
    faculty_code: string;
    faculty_name: string;
    faculty_dept: string;
    duty_type: string;
    reporting_time: string;
    status: string;
    is_locked: number;
    notes?: string;
  }>;
  unassignedHalls: Array<{
    hall_id: string;
    hall_code: string;
    hall_name: string;
    slot_index: number;
    duty_type: string;
    reason: string;
  }>;
  facultyWorkload: Array<{
    faculty_id: string;
    name: string;
    department: string;
    currentDuties: number;
    maxPeriod: number;
    dutiesToday: number;
    maxDay: number;
  }>;
}

/**
 * Real automatic student hall allocation algorithm
 */
export function runStudentAllocation(examId: string, options: AllocationOptions = {}): StudentAllocationResult {
  const exam = db.prepare('SELECT * FROM examinations WHERE id = ?').get(examId) as any;
  if (!exam) {
    return { success: false, error: `Examination with ID ${examId} not found.` };
  }

  // 1. Fetch eligible students
  let query = "SELECT * FROM students WHERE status = 'Active'";
  const params: any[] = [];

  // Filter by subject or department if specified
  const allStudents = db.prepare(query).all() as any[];
  let eligibleStudents = allStudents.filter(std => {
    // If specific student IDs provided, match them
    if (options.studentIds && options.studentIds.length > 0) {
      return options.studentIds.includes(std.id);
    }
    // Check subject eligibility
    try {
      const subjects: string[] = JSON.parse(std.eligible_subjects || '[]');
      if (subjects.includes(exam.subject_code)) {
        return true;
      }
    } catch (e) {
      // fallback
    }
    // Check department match
    const examDepts = exam.department.split(',').map((d: string) => d.trim().toUpperCase());
    return examDepts.includes(std.department.toUpperCase());
  });

  // Filter by register number range if provided
  if (options.regNoRangeStart) {
    eligibleStudents = eligibleStudents.filter(s => s.reg_no >= options.regNoRangeStart!);
  }
  if (options.regNoRangeEnd) {
    eligibleStudents = eligibleStudents.filter(s => s.reg_no <= options.regNoRangeEnd!);
  }

  // Sorting
  const sortBy = options.sortBy || 'reg_no_asc';
  if (sortBy === 'reg_no_asc') {
    eligibleStudents.sort((a, b) => a.reg_no.localeCompare(b.reg_no));
  } else if (sortBy === 'reg_no_desc') {
    eligibleStudents.sort((a, b) => b.reg_no.localeCompare(a.reg_no));
  } else if (sortBy === 'name_asc') {
    eligibleStudents.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (eligibleStudents.length === 0) {
    return {
      success: false,
      error: `No eligible students found for subject ${exam.subject_code} (${exam.subject_name}).`
    };
  }

  // 2. Fetch available halls
  let hallQuery = 'SELECT * FROM halls WHERE is_available = 1';
  let availableHalls = db.prepare(hallQuery).all() as any[];

  if (options.hallIds && options.hallIds.length > 0) {
    availableHalls = availableHalls.filter(h => options.hallIds!.includes(h.id));
  }

  if (availableHalls.length === 0) {
    return {
      success: false,
      error: 'No available examination halls found for seating allocation.'
    };
  }

  // Sort halls by capacity descending
  availableHalls.sort((a, b) => b.capacity - a.capacity);

  const totalAvailableCapacity = availableHalls.reduce((sum, h) => sum + h.capacity, 0);
  const totalNeeded = eligibleStudents.length;

  if (totalAvailableCapacity < totalNeeded) {
    return {
      success: false,
      error: `Insufficient hall capacity! Required seats: ${totalNeeded}, but selected available halls only provide: ${totalAvailableCapacity} seats (Deficit: ${totalNeeded - totalAvailableCapacity} seats). Please enable more halls or select a larger venue.`
    };
  }

  // 3. Department separation interleaving if requested
  let studentQueue: any[] = [];
  if (options.departmentSeparation) {
    // Group students by department
    const deptBuckets: Record<string, any[]> = {};
    for (const student of eligibleStudents) {
      if (!deptBuckets[student.department]) {
        deptBuckets[student.department] = [];
      }
      deptBuckets[student.department].push(student);
    }
    const deptKeys = Object.keys(deptBuckets);
    // Round-robin interleave to ensure adjacent students belong to different departments
    let done = false;
    let idx = 0;
    while (!done) {
      done = true;
      for (const dept of deptKeys) {
        if (deptBuckets[dept].length > idx) {
          studentQueue.push(deptBuckets[dept][idx]);
          done = false;
        }
      }
      idx++;
    }
  } else {
    studentQueue = [...eligibleStudents];
  }

  // 4. Distribute into halls
  const allocations: any[] = [];
  const hallBreakdown: any[] = [];
  let studentPtr = 0;
  let allocCounter = 1;

  for (const hall of availableHalls) {
    if (studentPtr >= studentQueue.length) break;

    const hallRows = hall.rows;
    const hallCols = hall.cols;
    const hallCapacity = hall.capacity;
    let hallAllocatedCount = 0;
    const deptCounts: Record<string, number> = {};

    for (let r = 0; r < hallRows; r++) {
      for (let c = 0; c < hallCols; c++) {
        if (hallAllocatedCount >= hallCapacity || studentPtr >= studentQueue.length) {
          break;
        }

        const student = studentQueue[studentPtr];
        const seatNumber = `${hall.hall_code}-R${r + 1}C${c + 1}`;

        allocations.push({
          id: `alloc-preview-${Date.now()}-${allocCounter++}`,
          student_id: student.id,
          student_name: student.name,
          reg_no: student.reg_no,
          department: student.department,
          hall_id: hall.id,
          hall_name: hall.name,
          hall_code: hall.hall_code,
          seat_number: seatNumber,
          row_index: r,
          col_index: c
        });

        deptCounts[student.department] = (deptCounts[student.department] || 0) + 1;
        hallAllocatedCount++;
        studentPtr++;
      }
      if (hallAllocatedCount >= hallCapacity || studentPtr >= studentQueue.length) {
        break;
      }
    }

    hallBreakdown.push({
      hall_id: hall.id,
      hall_code: hall.hall_code,
      hall_name: hall.name,
      capacity: hallCapacity,
      rows: hallRows,
      cols: hallCols,
      allocatedCount: hallAllocatedCount,
      vacantSeats: hallCapacity - hallAllocatedCount,
      departments: deptCounts
    });
  }

  const totalAllocated = allocations.length;
  const totalHallsUsed = hallBreakdown.length;
  const totalCapacityUsed = hallBreakdown.reduce((acc, h) => acc + h.capacity, 0);
  const occupancyRate = totalCapacityUsed > 0 ? Math.round((totalAllocated / totalCapacityUsed) * 100) : 0;

  return {
    success: true,
    message: `Successfully planned seating for ${totalAllocated} students across ${totalHallsUsed} examination halls.`,
    stats: {
      totalEligible: eligibleStudents.length,
      totalAllocated,
      totalHallsUsed,
      totalCapacityUsed,
      totalCapacityAvailable: totalAvailableCapacity,
      occupancyRate
    },
    allocations,
    hallBreakdown
  };
}

/**
 * Real automatic faculty duty assignment algorithm (Constraint-based greedy workload balancing)
 */
export function runFacultyDutyScheduling(examId: string, options: DutyAssignmentOptions = {}): DutySchedulingResult {
  const exam = db.prepare('SELECT * FROM examinations WHERE id = ?').get(examId) as any;
  if (!exam) {
    return {
      success: false,
      error: `Examination ${examId} not found`,
      fairnessScore: 0,
      assignments: [],
      unassignedHalls: [],
      facultyWorkload: []
    };
  }

  // Get distinct halls allocated for this exam
  const allocatedHallRows = db.prepare(`
    SELECT DISTINCT h.* 
    FROM halls h
    JOIN student_allocations sa ON sa.hall_id = h.id
    WHERE sa.exam_id = ?
    ORDER BY h.capacity DESC
  `).all(examId) as any[];

  let hallsToAssign = allocatedHallRows;
  // If no allocations confirmed yet, pick available halls
  if (hallsToAssign.length === 0) {
    hallsToAssign = db.prepare('SELECT * FROM halls WHERE is_available = 1 ORDER BY capacity DESC LIMIT 3').all() as any[];
  }

  // Existing duties
  const existingDuties = db.prepare('SELECT * FROM duty_assignments').all() as any[];
  const existingExamDuties = db.prepare('SELECT * FROM duty_assignments WHERE exam_id = ?').all(examId) as any[];
  const lockedDuties = existingExamDuties.filter((d: any) => d.is_locked === 1);

  // All faculty
  const facultyList = db.prepare('SELECT * FROM faculty WHERE is_available = 1').all() as any[];

  // Calculate existing workloads
  const totalDutyCountMap: Record<string, number> = {};
  const dayDutyCountMap: Record<string, number> = {};
  const examDutyFacultyIds = new Set<string>();

  for (const f of facultyList) {
    totalDutyCountMap[f.id] = 0;
    dayDutyCountMap[f.id] = 0;
  }

  for (const d of existingDuties) {
    const examItem = db.prepare('SELECT exam_date, session_name FROM examinations WHERE id = ?').get(d.exam_id) as any;
    if (examItem) {
      totalDutyCountMap[d.faculty_id] = (totalDutyCountMap[d.faculty_id] || 0) + 1;
      if (examItem.exam_date === exam.exam_date) {
        dayDutyCountMap[d.faculty_id] = (dayDutyCountMap[d.faculty_id] || 0) + 1;
      }
      if (d.exam_id === examId) {
        examDutyFacultyIds.add(d.faculty_id);
      }
    }
  }

  const requiredPerHall = options.requiredPerHall || exam.required_invigilators_per_hall || 1;
  const assignments: any[] = [];
  const unassignedHalls: any[] = [];

  // Track duties assigned in this session
  const assignedFacultyThisExam = new Set<string>();

  // Process locked duties first
  if (options.preserveLocked) {
    for (const locked of lockedDuties) {
      const fac = facultyList.find(f => f.id === locked.faculty_id);
      const hall = hallsToAssign.find(h => h.id === locked.hall_id);
      if (fac && hall) {
        assignments.push({
          id: locked.id,
          exam_id: examId,
          hall_id: hall.id,
          hall_code: hall.hall_code,
          hall_name: hall.name,
          faculty_id: fac.id,
          faculty_code: fac.faculty_id,
          faculty_name: fac.name,
          faculty_dept: fac.department,
          duty_type: locked.duty_type,
          reporting_time: locked.reporting_time,
          status: locked.status || 'Confirmed',
          is_locked: 1,
          notes: locked.notes || 'Locked assignment'
        });
        assignedFacultyThisExam.add(fac.id);
      }
    }
  }

  // For each hall, determine needed slots
  for (const hall of hallsToAssign) {
    // If hall is very large (> 35 students), require 2 invigilators automatically
    const invigilatorsNeeded = hall.capacity > 35 ? Math.max(requiredPerHall, 2) : requiredPerHall;

    // Count already locked assignments for this hall
    const lockedInThisHall = assignments.filter(a => a.hall_id === hall.id);
    const slotsToFill = invigilatorsNeeded - lockedInThisHall.length;

    for (let slot = 0; slot < slotsToFill; slot++) {
      const isChiefSlot = (slot === 0 && lockedInThisHall.length === 0 && hall.capacity >= 24);
      const dutyType = isChiefSlot ? 'Chief Invigilator' : 'Hall Invigilator';

      // Find best faculty candidate based on constraints
      let candidate: any = null;
      let rejectionReason = 'No eligible faculty available';

      // Candidate scoring & filtering:
      const eligibleCandidates = facultyList.filter(fac => {
        // 1. Not already assigned to this examination
        if (assignedFacultyThisExam.has(fac.id)) {
          return false;
        }

        // 2. Check overlapping duties on exact same date and session
        const conflict = existingDuties.some((d: any) => {
          if (d.faculty_id !== fac.id || d.exam_id === examId) return false;
          const ex = db.prepare('SELECT exam_date, session_name FROM examinations WHERE id = ?').get(d.exam_id) as any;
          return ex && ex.exam_date === exam.exam_date && ex.session_name === exam.session_name;
        });
        if (conflict) {
          rejectionReason = `Faculty has concurrent duty in another hall on ${exam.exam_date} (${exam.session_name})`;
          return false;
        }

        // 3. Max daily duties
        const todayCount = (dayDutyCountMap[fac.id] || 0) + (assignedFacultyThisExam.has(fac.id) ? 1 : 0);
        if (todayCount >= fac.max_duties_per_day) {
          rejectionReason = `Daily duty quota reached (${fac.max_duties_per_day}/day)`;
          return false;
        }

        // 4. Max period duties
        const periodCount = totalDutyCountMap[fac.id] || 0;
        if (periodCount >= fac.max_duties_period) {
          rejectionReason = `Total exam period quota reached (${fac.max_duties_period} max)`;
          return false;
        }

        // 5. Unavailable session check
        try {
          const unavail = JSON.parse(fac.unavailable_sessions || '[]');
          const sessionKey = `${exam.exam_date}-${exam.session_name}`;
          if (unavail.includes(sessionKey) || unavail.includes(exam.session_name)) {
            rejectionReason = `Session marked unavailable in faculty preferences`;
            return false;
          }
        } catch (e) {}

        return true;
      });

      if (eligibleCandidates.length === 0) {
        unassignedHalls.push({
          hall_id: hall.id,
          hall_code: hall.hall_code,
          hall_name: hall.name,
          slot_index: slot + 1,
          duty_type: dutyType,
          reason: rejectionReason
        });
        continue;
      }

      // Sort candidates by:
      // a. Workload fairness (lowest total duties first)
      // b. Department separation rule (if enabled: non-exam department preferred)
      // c. Preferred session match
      // d. For Chief Invigilator: Senior designations or certified
      eligibleCandidates.sort((a, b) => {
        // Preference for department separation:
        if (options.departmentSeparation) {
          const aDeptMatch = exam.department.includes(a.department) ? 1 : 0;
          const bDeptMatch = exam.department.includes(b.department) ? 1 : 0;
          if (aDeptMatch !== bDeptMatch) {
            return aDeptMatch - bDeptMatch; // Prefer external department
          }
        }

        // If Chief slot, prefer Professor
        if (isChiefSlot) {
          const aProf = a.designation.includes('Professor') && !a.designation.includes('Assistant') ? -1 : 0;
          const bProf = b.designation.includes('Professor') && !b.designation.includes('Assistant') ? -1 : 0;
          if (aProf !== bProf) return aProf - bProf;
        }

        // Workload balancing: choose lowest current duties
        const aCount = totalDutyCountMap[a.id] || 0;
        const bCount = totalDutyCountMap[b.id] || 0;
        return aCount - bCount;
      });

      candidate = eligibleCandidates[0];

      // Assign candidate
      assignedFacultyThisExam.add(candidate.id);
      totalDutyCountMap[candidate.id] = (totalDutyCountMap[candidate.id] || 0) + 1;
      dayDutyCountMap[candidate.id] = (dayDutyCountMap[candidate.id] || 0) + 1;

      // Determine reporting time (typically 30-45 minutes before exam start)
      let reporting = '08:45 AM';
      if (exam.start_time) {
        const [hh, mm] = exam.start_time.split(':').map(Number);
        const reportH = hh === 0 ? 12 : hh;
        const ampm = reportH >= 12 ? 'PM' : 'AM';
        reporting = `${(reportH % 12 || 12).toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')} ${ampm} (45m prior)`;
      }

      assignments.push({
        id: `duty-preview-${Date.now()}-${assignments.length + 1}`,
        exam_id: examId,
        hall_id: hall.id,
        hall_code: hall.hall_code,
        hall_name: hall.name,
        faculty_id: candidate.id,
        faculty_code: candidate.faculty_id,
        faculty_name: candidate.name,
        faculty_dept: candidate.department,
        duty_type: dutyType,
        reporting_time: reporting,
        status: 'Assigned',
        is_locked: 0,
        notes: `Assigned based on workload balance (${totalDutyCountMap[candidate.id]} total duties)`
      });
    }
  }

  // Workload summary & Fairness Score calculation
  const facultyWorkload = facultyList.map(f => ({
    faculty_id: f.id,
    name: f.name,
    department: f.department,
    currentDuties: totalDutyCountMap[f.id] || 0,
    maxPeriod: f.max_duties_period,
    dutiesToday: dayDutyCountMap[f.id] || 0,
    maxDay: f.max_duties_per_day
  }));

  // Calculate fairness score:
  // Variance among active faculty duty counts:
  const dutyCounts = facultyWorkload.map(fw => fw.currentDuties);
  const avg = dutyCounts.reduce((a, b) => a + b, 0) / (dutyCounts.length || 1);
  const variance = dutyCounts.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (dutyCounts.length || 1);
  const stdDev = Math.sqrt(variance);
  // Fairness Score between 0 and 100% (lower std dev = higher fairness)
  const fairnessScore = Math.max(10, Math.min(100, Math.round(100 - (stdDev * 18))));

  return {
    success: unassignedHalls.length === 0,
    message: unassignedHalls.length === 0
      ? `Assigned ${assignments.length} invigilators successfully across ${hallsToAssign.length} halls.`
      : `Partially scheduled with ${unassignedHalls.length} unassigned duty slots due to faculty constraints.`,
    fairnessScore,
    assignments,
    unassignedHalls,
    facultyWorkload
  };
}
