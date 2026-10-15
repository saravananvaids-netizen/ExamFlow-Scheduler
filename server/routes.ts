import { Router, Request, Response } from 'express';
import { db, seedDatabase } from './db.js';
import { runStudentAllocation, runFacultyDutyScheduling } from './algorithms.js';

export const router = Router();

function logAudit(userName: string, userRole: string, action: string, entity: string, entityId: string | null, details: string) {
  try {
    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, entity, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, new Date().toISOString(), userName, userRole, action, entity, entityId, details);
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

// ================= AUTHENTICATION =================
router.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  logAudit(user.name, user.role, 'LOGIN', 'USERS', user.id, `User ${user.username} logged in.`);
  res.json({ user: userWithoutPassword, token: `demo-token-${user.id}` });
});

router.get('/auth/demo-users', (_req: Request, res: Response) => {
  const users = db.prepare('SELECT id, username, name, role, email, department, faculty_id FROM users').all();
  res.json(users);
});

// ================= DASHBOARD =================
router.get('/dashboard/stats', (_req: Request, res: Response) => {
  const totalStudents = (db.prepare('SELECT COUNT(*) as c FROM students').get() as any).c;
  const totalHalls = (db.prepare('SELECT COUNT(*) as c FROM halls').get() as any).c;
  const availableHalls = (db.prepare('SELECT COUNT(*) as c FROM halls WHERE is_available = 1').get() as any).c;
  const totalFaculty = (db.prepare('SELECT COUNT(*) as c FROM faculty').get() as any).c;
  const availableFaculty = (db.prepare('SELECT COUNT(*) as c FROM faculty WHERE is_available = 1').get() as any).c;
  const upcomingExams = (db.prepare("SELECT COUNT(*) as c FROM examinations WHERE status != 'Completed' AND status != 'Cancelled'").get() as any).c;
  const totalDuties = (db.prepare('SELECT COUNT(*) as c FROM duty_assignments').get() as any).c;
  
  // Calculate total hall capacity vs allocated seats across confirmed exams
  const totalCapacityResult = (db.prepare('SELECT SUM(capacity) as cap FROM halls WHERE is_available = 1').get() as any).cap || 0;
  const totalAllocatedSeats = (db.prepare('SELECT COUNT(*) as c FROM student_allocations').get() as any).c;

  // Unassigned check:
  // Exams with status Draft or Allocated (not confirmed)
  const draftExams = db.prepare("SELECT id, exam_name, exam_code, total_eligible_students FROM examinations WHERE status = 'Draft'").all() as any[];
  
  // Faculty workload distribution
  const facultyDuties = db.prepare(`
    SELECT f.id, f.name, f.department, f.max_duties_period, COUNT(d.id) as assigned_duties
    FROM faculty f
    LEFT JOIN duty_assignments d ON d.faculty_id = f.id
    WHERE f.is_available = 1
    GROUP BY f.id
    ORDER BY assigned_duties DESC
  `).all() as any[];

  // Department-wise student breakdown
  const departmentStats = db.prepare(`
    SELECT department, COUNT(*) as count 
    FROM students 
    GROUP BY department
  `).all() as any[];

  // Upcoming examinations schedule list
  const upcomingExamsList = db.prepare(`
    SELECT * FROM examinations 
    ORDER BY exam_date ASC, start_time ASC 
    LIMIT 6
  `).all() as any[];

  // Recent activity audit logs
  const recentActivity = db.prepare(`
    SELECT * FROM audit_logs 
    ORDER BY timestamp DESC 
    LIMIT 8
  `).all() as any[];

  // Hall capacity warnings
  const capacityWarnings: string[] = [];
  for (const ex of upcomingExamsList) {
    if (ex.total_eligible_students > totalCapacityResult) {
      capacityWarnings.push(`Exam ${ex.exam_code} (${ex.subject_code}) requires ${ex.total_eligible_students} seats, which exceeds total campus capacity of ${totalCapacityResult}!`);
    }
  }

  // Calculate fairness score across faculty workload
  const counts = facultyDuties.map(f => f.assigned_duties);
  const avg = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);
  const variance = counts.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (counts.length || 1);
  const stdDev = Math.sqrt(variance);
  const fairnessScore = Math.max(15, Math.min(100, Math.round(100 - (stdDev * 16))));

  res.json({
    totalStudents,
    totalHalls,
    availableHalls,
    maintenanceHalls: totalHalls - availableHalls,
    totalFaculty,
    availableFaculty,
    upcomingExams,
    totalDuties,
    totalCapacity: totalCapacityResult,
    totalAllocatedSeats,
    hallOccupancyPercent: totalCapacityResult > 0 ? Math.min(100, Math.round((totalAllocatedSeats / totalCapacityResult) * 100)) : 0,
    fairnessScore,
    facultyWorkload: facultyDuties,
    departmentStats,
    upcomingExamsList,
    recentActivity,
    capacityWarnings,
    draftExamsCount: draftExams.length
  });
});

// ================= STUDENTS =================
router.get('/students', (req: Request, res: Response) => {
  const { search, department, semester } = req.query;
  let query = 'SELECT * FROM students WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (reg_no LIKE ? OR name LIKE ? OR email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (department) {
    query += ' AND department = ?';
    params.push(department);
  }
  if (semester) {
    query += ' AND semester = ?';
    params.push(Number(semester));
  }

  query += ' ORDER BY reg_no ASC';
  const students = db.prepare(query).all(...params);
  res.json(students);
});

router.post('/students', (req: Request, res: Response) => {
  const { reg_no, name, department, semester, year, eligible_subjects, email } = req.body;
  if (!reg_no || !name || !department) {
    return res.status(400).json({ error: 'Register number, name, and department are mandatory.' });
  }

  const existing = db.prepare('SELECT id FROM students WHERE reg_no = ?').get(reg_no);
  if (existing) {
    return res.status(400).json({ error: `Student with Register Number ${reg_no} already exists.` });
  }

  const id = `std-${Date.now()}`;
  db.prepare(`
    INSERT INTO students (id, reg_no, name, department, semester, year, eligible_subjects, email, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
  `).run(id, reg_no, name, department, semester || 1, year || 1, typeof eligible_subjects === 'string' ? eligible_subjects : JSON.stringify(eligible_subjects || []), email || '');

  logAudit(req.body.currentUser || 'Administrator', 'admin', 'CREATE_STUDENT', 'STUDENTS', id, `Created student ${name} (${reg_no})`);
  res.status(201).json({ id, message: 'Student created successfully' });
});

router.put('/students/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reg_no, name, department, semester, year, eligible_subjects, email, status } = req.body;

  db.prepare(`
    UPDATE students 
    SET reg_no = ?, name = ?, department = ?, semester = ?, year = ?, eligible_subjects = ?, email = ?, status = ?
    WHERE id = ?
  `).run(
    reg_no,
    name,
    department,
    semester,
    year,
    typeof eligible_subjects === 'string' ? eligible_subjects : JSON.stringify(eligible_subjects || []),
    email,
    status || 'Active',
    id
  );

  logAudit(req.body.currentUser || 'Administrator', 'admin', 'UPDATE_STUDENT', 'STUDENTS', id, `Updated student ${name} (${reg_no})`);
  res.json({ message: 'Student updated successfully' });
});

router.delete('/students/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const student = db.prepare('SELECT name, reg_no FROM students WHERE id = ?').get(id) as any;
  if (student) {
    db.prepare('DELETE FROM students WHERE id = ?').run(id);
    logAudit(req.query.currentUser as string || 'Administrator', 'admin', 'DELETE_STUDENT', 'STUDENTS', id, `Deleted student ${student.name} (${student.reg_no})`);
  }
  res.json({ message: 'Student deleted successfully' });
});

// Student CSV / Spreadsheet Import
router.post('/students/import', (req: Request, res: Response) => {
  const { records, previewOnly } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'No records provided for import.' });
  }

  const validRecords: any[] = [];
  const errors: Array<{ row: number; reg_no?: string; error: string }> = [];
  const existingRegNos = new Set((db.prepare('SELECT reg_no FROM students').all() as any[]).map(s => s.reg_no.toUpperCase()));
  const seenInBatch = new Set<string>();

  records.forEach((row, index) => {
    const rowNum = index + 1;
    const reg_no = (row.reg_no || row.RegisterNumber || row['Reg No'] || '').trim().toUpperCase();
    const name = (row.name || row.Name || row['Student Name'] || '').trim();
    const department = (row.department || row.Department || row.Dept || '').trim();
    const semester = parseInt(row.semester || row.Semester || '1', 10);
    const year = parseInt(row.year || row.Year || '1', 10);
    const email = (row.email || row.Email || '').trim();
    const subjects = row.eligible_subjects || row.Subjects || '[]';

    if (!reg_no) {
      errors.push({ row: rowNum, error: 'Missing Register Number' });
      return;
    }
    if (!name) {
      errors.push({ row: rowNum, reg_no, error: 'Missing Student Name' });
      return;
    }
    if (!department) {
      errors.push({ row: rowNum, reg_no, error: 'Missing Department' });
      return;
    }
    if (existingRegNos.has(reg_no)) {
      errors.push({ row: rowNum, reg_no, error: `Register Number ${reg_no} already exists in database` });
      return;
    }
    if (seenInBatch.has(reg_no)) {
      errors.push({ row: rowNum, reg_no, error: `Duplicate Register Number ${reg_no} in upload file` });
      return;
    }

    seenInBatch.add(reg_no);
    validRecords.push({
      id: `std-imp-${Date.now()}-${index}`,
      reg_no,
      name,
      department,
      semester,
      year,
      email,
      eligible_subjects: typeof subjects === 'string' ? subjects : JSON.stringify(subjects)
    });
  });

  if (previewOnly) {
    return res.json({
      total: records.length,
      validCount: validRecords.length,
      errorCount: errors.length,
      errors,
      preview: validRecords.slice(0, 10)
    });
  }

  // Insert valid records
  const insert = db.prepare(`
    INSERT INTO students (id, reg_no, name, department, semester, year, eligible_subjects, email, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
  `);

  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      insert.run(r.id, r.reg_no, r.name, r.department, r.semester, r.year, r.eligible_subjects, r.email);
    }
  });

  insertMany(validRecords);
  logAudit(req.body.currentUser || 'Administrator', 'admin', 'IMPORT_STUDENTS', 'STUDENTS', null, `Bulk imported ${validRecords.length} students with ${errors.length} skipped errors.`);

  res.json({
    message: `Successfully imported ${validRecords.length} students.`,
    importedCount: validRecords.length,
    errorCount: errors.length,
    errors
  });
});

// ================= EXAMINATION HALLS =================
router.get('/halls', (_req: Request, res: Response) => {
  const halls = db.prepare('SELECT * FROM halls ORDER BY building ASC, floor ASC, hall_code ASC').all();
  res.json(halls);
});

router.post('/halls', (req: Request, res: Response) => {
  const { hall_code, name, building, floor, capacity, rows, cols, is_accessible, is_available, maintenance_notes } = req.body;
  if (!hall_code || !name || !capacity) {
    return res.status(400).json({ error: 'Hall code, name, and capacity are required.' });
  }

  const existing = db.prepare('SELECT id FROM halls WHERE hall_code = ?').get(hall_code);
  if (existing) {
    return res.status(400).json({ error: `Hall with code ${hall_code} already exists.` });
  }

  const id = `hall-${Date.now()}`;
  db.prepare(`
    INSERT INTO halls (id, hall_code, name, building, floor, capacity, rows, cols, is_accessible, is_available, maintenance_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    hall_code,
    name,
    building || 'Main Block',
    floor || 1,
    Number(capacity),
    Number(rows) || Math.ceil(Math.sqrt(capacity)),
    Number(cols) || Math.ceil(capacity / (rows || 4)),
    is_accessible !== undefined ? (is_accessible ? 1 : 0) : 1,
    is_available !== undefined ? (is_available ? 1 : 0) : 1,
    maintenance_notes || null
  );

  logAudit(req.body.currentUser || 'Administrator', 'admin', 'CREATE_HALL', 'HALLS', id, `Added exam hall ${hall_code} (${name}) with capacity ${capacity}`);
  res.status(201).json({ id, message: 'Examination Hall added successfully' });
});

router.put('/halls/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { hall_code, name, building, floor, capacity, rows, cols, is_accessible, is_available, maintenance_notes } = req.body;

  db.prepare(`
    UPDATE halls
    SET hall_code = ?, name = ?, building = ?, floor = ?, capacity = ?, rows = ?, cols = ?, is_accessible = ?, is_available = ?, maintenance_notes = ?
    WHERE id = ?
  `).run(
    hall_code,
    name,
    building,
    floor,
    capacity,
    rows,
    cols,
    is_accessible ? 1 : 0,
    is_available ? 1 : 0,
    maintenance_notes || null,
    id
  );

  logAudit(req.body.currentUser || 'Administrator', 'admin', 'UPDATE_HALL', 'HALLS', id, `Updated hall ${hall_code}`);
  res.json({ message: 'Hall updated successfully' });
});

router.patch('/halls/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { is_available, maintenance_notes } = req.body;

  db.prepare(`
    UPDATE halls 
    SET is_available = ?, maintenance_notes = ? 
    WHERE id = ?
  `).run(is_available ? 1 : 0, maintenance_notes || null, id);

  res.json({ message: 'Hall status updated' });
});

router.delete('/halls/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM halls WHERE id = ?').run(id);
  res.json({ message: 'Hall deleted successfully' });
});

// ================= FACULTY =================
router.get('/faculty', (_req: Request, res: Response) => {
  const faculty = db.prepare(`
    SELECT f.*, COUNT(d.id) as current_duties
    FROM faculty f
    LEFT JOIN duty_assignments d ON d.faculty_id = f.id
    GROUP BY f.id
    ORDER BY f.department ASC, f.name ASC
  `).all();
  res.json(faculty);
});

router.post('/faculty', (req: Request, res: Response) => {
  const { faculty_id, name, department, email, phone, designation, max_duties_per_day, max_duties_period, preferred_sessions, unavailable_sessions, is_available, special_qualification } = req.body;
  if (!faculty_id || !name || !department || !email) {
    return res.status(400).json({ error: 'Faculty ID, name, department, and email are required.' });
  }

  const existing = db.prepare('SELECT id FROM faculty WHERE faculty_id = ?').get(faculty_id);
  if (existing) {
    return res.status(400).json({ error: `Faculty ID ${faculty_id} already exists.` });
  }

  const id = `fac-${Date.now()}`;
  db.prepare(`
    INSERT INTO faculty (id, faculty_id, name, department, email, phone, designation, max_duties_per_day, max_duties_period, preferred_sessions, unavailable_sessions, is_available, special_qualification)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    faculty_id,
    name,
    department,
    email,
    phone || '',
    designation || 'Assistant Professor',
    max_duties_per_day || 1,
    max_duties_period || 6,
    typeof preferred_sessions === 'string' ? preferred_sessions : JSON.stringify(preferred_sessions || []),
    typeof unavailable_sessions === 'string' ? unavailable_sessions : JSON.stringify(unavailable_sessions || []),
    is_available !== undefined ? (is_available ? 1 : 0) : 1,
    special_qualification || null
  );

  logAudit(req.body.currentUser || 'Administrator', 'admin', 'CREATE_FACULTY', 'FACULTY', id, `Added faculty member ${name} (${faculty_id})`);
  res.status(201).json({ id, message: 'Faculty created successfully' });
});

router.put('/faculty/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { faculty_id, name, department, email, phone, designation, max_duties_per_day, max_duties_period, preferred_sessions, unavailable_sessions, is_available, special_qualification } = req.body;

  db.prepare(`
    UPDATE faculty
    SET faculty_id = ?, name = ?, department = ?, email = ?, phone = ?, designation = ?, max_duties_per_day = ?, max_duties_period = ?, preferred_sessions = ?, unavailable_sessions = ?, is_available = ?, special_qualification = ?
    WHERE id = ?
  `).run(
    faculty_id,
    name,
    department,
    email,
    phone,
    designation,
    max_duties_per_day,
    max_duties_period,
    typeof preferred_sessions === 'string' ? preferred_sessions : JSON.stringify(preferred_sessions || []),
    typeof unavailable_sessions === 'string' ? unavailable_sessions : JSON.stringify(unavailable_sessions || []),
    is_available ? 1 : 0,
    special_qualification || null,
    id
  );

  logAudit(req.body.currentUser || 'Administrator', 'admin', 'UPDATE_FACULTY', 'FACULTY', id, `Updated faculty profile ${name}`);
  res.json({ message: 'Faculty updated successfully' });
});

router.delete('/faculty/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM faculty WHERE id = ?').run(id);
  res.json({ message: 'Faculty deleted successfully' });
});

// ================= EXAMINATIONS =================
router.get('/examinations', (_req: Request, res: Response) => {
  const exams = db.prepare(`
    SELECT e.*, 
      (SELECT COUNT(*) FROM student_allocations sa WHERE sa.exam_id = e.id) as allocated_count,
      (SELECT COUNT(DISTINCT sa.hall_id) FROM student_allocations sa WHERE sa.exam_id = e.id) as halls_count,
      (SELECT COUNT(*) FROM duty_assignments da WHERE da.exam_id = e.id) as invigilators_count
    FROM examinations e
    ORDER BY e.exam_date ASC, e.start_time ASC
  `).all();
  res.json(exams);
});

router.get('/examinations/:id', (req: Request, res: Response) => {
  const exam = db.prepare('SELECT * FROM examinations WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  res.json(exam);
});

router.post('/examinations', (req: Request, res: Response) => {
  const { exam_code, exam_name, subject_code, subject_name, department, semester, exam_date, start_time, end_time, session_name, total_eligible_students, required_invigilators_per_hall } = req.body;
  if (!exam_code || !exam_name || !subject_code || !exam_date) {
    return res.status(400).json({ error: 'Exam code, name, subject code, and date are required.' });
  }

  // Conflict check: Overlapping exams in same session for same department
  const conflicts = db.prepare(`
    SELECT * FROM examinations 
    WHERE exam_date = ? AND session_name = ? AND department = ?
  `).all(exam_date, session_name, department) as any[];

  if (conflicts.length > 0) {
    return res.status(400).json({
      error: `Scheduling conflict! Department ${department} already has exam "${conflicts[0].exam_name}" scheduled on ${exam_date} (${session_name}).`
    });
  }

  const id = `exam-${Date.now()}`;
  db.prepare(`
    INSERT INTO examinations (id, exam_code, exam_name, subject_code, subject_name, department, semester, exam_date, start_time, end_time, session_name, total_eligible_students, required_invigilators_per_hall, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')
  `).run(
    id,
    exam_code,
    exam_name,
    subject_code,
    subject_name,
    department,
    semester || 1,
    exam_date,
    start_time || '09:30',
    end_time || '12:30',
    session_name || 'FN',
    Number(total_eligible_students) || 0,
    Number(required_invigilators_per_hall) || 1
  );

  logAudit(req.body.currentUser || 'Exam Cell', 'exam_cell', 'CREATE_EXAM', 'EXAMINATIONS', id, `Scheduled examination ${exam_code} (${exam_name}) on ${exam_date}`);
  res.status(201).json({ id, message: 'Examination created successfully' });
});

router.put('/examinations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { exam_code, exam_name, subject_code, subject_name, department, semester, exam_date, start_time, end_time, session_name, total_eligible_students, required_invigilators_per_hall, status } = req.body;

  db.prepare(`
    UPDATE examinations
    SET exam_code = ?, exam_name = ?, subject_code = ?, subject_name = ?, department = ?, semester = ?, exam_date = ?, start_time = ?, end_time = ?, session_name = ?, total_eligible_students = ?, required_invigilators_per_hall = ?, status = ?
    WHERE id = ?
  `).run(
    exam_code,
    exam_name,
    subject_code,
    subject_name,
    department,
    semester,
    exam_date,
    start_time,
    end_time,
    session_name,
    total_eligible_students,
    required_invigilators_per_hall,
    status || 'Draft',
    id
  );

  logAudit(req.body.currentUser || 'Exam Cell', 'exam_cell', 'UPDATE_EXAM', 'EXAMINATIONS', id, `Updated examination ${exam_code}`);
  res.json({ message: 'Examination updated successfully' });
});

router.delete('/examinations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM examinations WHERE id = ?').run(id);
  res.json({ message: 'Examination deleted successfully' });
});

// ================= STUDENT ALLOCATIONS =================
router.post('/allocations/preview', (req: Request, res: Response) => {
  const { examId, options } = req.body;
  if (!examId) return res.status(400).json({ error: 'Examination ID is required.' });

  const result = runStudentAllocation(examId, options || {});
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

router.post('/allocations/confirm', (req: Request, res: Response) => {
  const { examId, allocations } = req.body;
  if (!examId || !Array.isArray(allocations)) {
    return res.status(400).json({ error: 'Exam ID and allocations list required.' });
  }

  // Delete previous allocations for this exam
  db.prepare('DELETE FROM student_allocations WHERE exam_id = ?').run(examId);

  const insert = db.prepare(`
    INSERT INTO student_allocations (id, exam_id, hall_id, student_id, seat_number, row_index, col_index, is_confirmed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const now = new Date().toISOString();
  const insertAll = db.transaction((items) => {
    for (const item of items) {
      insert.run(
        `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        examId,
        item.hall_id,
        item.student_id,
        item.seat_number,
        item.row_index,
        item.col_index,
        now
      );
    }
  });

  insertAll(allocations);

  // Update exam status to 'Allocated' or 'Confirmed'
  db.prepare("UPDATE examinations SET status = 'Allocated' WHERE id = ? AND status = 'Draft'").run(examId);

  logAudit(req.body.currentUser || 'Exam Cell', 'exam_cell', 'CONFIRM_ALLOCATION', 'STUDENT_ALLOCATIONS', examId, `Confirmed seating allocation for ${allocations.length} students.`);
  res.json({ success: true, message: `Successfully saved and confirmed seating for ${allocations.length} students.` });
});

router.get('/allocations/by-exam/:examId', (req: Request, res: Response) => {
  const { examId } = req.params;
  const allocations = db.prepare(`
    SELECT sa.*, s.name as student_name, s.reg_no, s.department, h.name as hall_name, h.hall_code, h.rows as hall_rows, h.cols as hall_cols, h.capacity as hall_capacity
    FROM student_allocations sa
    JOIN students s ON s.id = sa.student_id
    JOIN halls h ON h.id = sa.hall_id
    WHERE sa.exam_id = ?
    ORDER BY h.hall_code ASC, sa.row_index ASC, sa.col_index ASC
  `).all(examId) as any[];

  // Group by hall
  const hallMap: Record<string, any> = {};
  for (const a of allocations) {
    if (!hallMap[a.hall_id]) {
      hallMap[a.hall_id] = {
        hall_id: a.hall_id,
        hall_code: a.hall_code,
        hall_name: a.hall_name,
        rows: a.hall_rows,
        cols: a.hall_cols,
        capacity: a.hall_capacity,
        students: []
      };
    }
    hallMap[a.hall_id].students.push(a);
  }

  res.json({
    totalAllocated: allocations.length,
    allocations,
    halls: Object.values(hallMap)
  });
});

router.get('/allocations/hall-seating/:examId/:hallId', (req: Request, res: Response) => {
  const { examId, hallId } = req.params;
  const hall = db.prepare('SELECT * FROM halls WHERE id = ?').get(hallId) as any;
  if (!hall) return res.status(404).json({ error: 'Hall not found' });

  const allocations = db.prepare(`
    SELECT sa.*, s.name as student_name, s.reg_no, s.department, s.email
    FROM student_allocations sa
    JOIN students s ON s.id = sa.student_id
    WHERE sa.exam_id = ? AND sa.hall_id = ?
  `).all(examId, hallId) as any[];

  // Build 2D matrix of desk cells
  const grid: any[][] = [];
  const allocMap = new Map<string, any>();
  for (const a of allocations) {
    allocMap.set(`${a.row_index}-${a.col_index}`, a);
  }

  for (let r = 0; r < hall.rows; r++) {
    const rowList: any[] = [];
    for (let c = 0; c < hall.cols; c++) {
      const match = allocMap.get(`${r}-${c}`);
      const seatNo = `${hall.hall_code}-R${r + 1}C${c + 1}`;
      if (match) {
        rowList.push({
          status: 'Occupied',
          seatNumber: seatNo,
          student: match,
          rowIndex: r,
          colIndex: c
        });
      } else {
        rowList.push({
          status: 'Vacant',
          seatNumber: seatNo,
          student: null,
          rowIndex: r,
          colIndex: c
        });
      }
    }
    grid.push(rowList);
  }

  res.json({ hall, grid, totalAllocated: allocations.length, capacity: hall.capacity });
});

router.delete('/allocations/by-exam/:examId', (req: Request, res: Response) => {
  const { examId } = req.params;
  db.prepare('DELETE FROM student_allocations WHERE exam_id = ?').run(examId);
  db.prepare("UPDATE examinations SET status = 'Draft' WHERE id = ?").run(examId);
  logAudit(req.query.currentUser as string || 'Exam Cell', 'exam_cell', 'CLEAR_ALLOCATION', 'STUDENT_ALLOCATIONS', examId, 'Cleared all student seating allocations for examination.');
  res.json({ message: 'Allocations cleared successfully.' });
});

// ================= FACULTY DUTY SCHEDULING =================
router.post('/duties/preview', (req: Request, res: Response) => {
  const { examId, options } = req.body;
  if (!examId) return res.status(400).json({ error: 'Exam ID required' });

  const result = runFacultyDutyScheduling(examId, options || {});
  res.json(result);
});

router.post('/duties/confirm', (req: Request, res: Response) => {
  const { examId, assignments } = req.body;
  if (!examId || !Array.isArray(assignments)) {
    return res.status(400).json({ error: 'Exam ID and assignments required' });
  }

  // Preserve locked duties that are not overwritten
  db.prepare('DELETE FROM duty_assignments WHERE exam_id = ? AND is_locked = 0').run(examId);

  const insert = db.prepare(`
    INSERT INTO duty_assignments (id, exam_id, hall_id, faculty_id, duty_type, reporting_time, status, is_locked, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Assigned', ?, ?, ?)
  `);

  const now = new Date().toISOString();
  for (const a of assignments) {
    // If not already existing locked duty
    const exists = db.prepare('SELECT id FROM duty_assignments WHERE exam_id = ? AND hall_id = ? AND faculty_id = ?').get(examId, a.hall_id, a.faculty_id);
    if (!exists) {
      insert.run(
        `duty-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        examId,
        a.hall_id,
        a.faculty_id,
        a.duty_type || 'Hall Invigilator',
        a.reporting_time || '08:45 AM',
        a.is_locked ? 1 : 0,
        a.notes || '',
        now
      );
    }
  }

  db.prepare("UPDATE examinations SET status = 'Confirmed' WHERE id = ?").run(examId);
  logAudit(req.body.currentUser || 'Dean / Admin', 'admin', 'CONFIRM_DUTIES', 'DUTY_ASSIGNMENTS', examId, `Confirmed ${assignments.length} faculty duty assignments.`);
  res.json({ success: true, message: `Successfully assigned ${assignments.length} faculty duties.` });
});

router.get('/duties/by-exam/:examId', (req: Request, res: Response) => {
  const { examId } = req.params;
  const duties = db.prepare(`
    SELECT da.*, f.name as faculty_name, f.faculty_id as faculty_code, f.department as faculty_dept, f.phone, f.email,
           h.name as hall_name, h.hall_code, h.building, e.exam_name, e.exam_date, e.start_time, e.end_time, e.session_name, e.subject_code
    FROM duty_assignments da
    JOIN faculty f ON f.id = da.faculty_id
    JOIN halls h ON h.id = da.hall_id
    JOIN examinations e ON e.id = da.exam_id
    WHERE da.exam_id = ?
    ORDER BY h.hall_code ASC
  `).all(examId);
  res.json(duties);
});

router.get('/duties/by-faculty/:facultyId', (req: Request, res: Response) => {
  const { facultyId } = req.params;
  const faculty = db.prepare('SELECT * FROM faculty WHERE id = ? OR faculty_id = ?').get(facultyId, facultyId) as any;
  if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

  const duties = db.prepare(`
    SELECT da.*, e.exam_code, e.exam_name, e.subject_code, e.subject_name, e.exam_date, e.start_time, e.end_time, e.session_name,
           h.hall_code, h.name as hall_name, h.building, h.floor
    FROM duty_assignments da
    JOIN examinations e ON e.id = da.exam_id
    JOIN halls h ON h.id = da.hall_id
    WHERE da.faculty_id = ?
    ORDER BY e.exam_date ASC, e.start_time ASC
  `).all(faculty.id);

  res.json({ faculty, duties, totalDuties: duties.length });
});

router.patch('/duties/:dutyId/status', (req: Request, res: Response) => {
  const { dutyId } = req.params;
  const { status, notes } = req.body;
  db.prepare(`
    UPDATE duty_assignments
    SET status = ?, notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(status, notes || null, dutyId);
  res.json({ message: 'Duty status updated.' });
});

router.patch('/duties/:dutyId/lock', (req: Request, res: Response) => {
  const { dutyId } = req.params;
  const { is_locked } = req.body;
  db.prepare('UPDATE duty_assignments SET is_locked = ? WHERE id = ?').run(is_locked ? 1 : 0, dutyId);
  res.json({ message: 'Duty lock toggled.' });
});

// Manual Reassign
router.post('/duties/reassign', (req: Request, res: Response) => {
  const { dutyId, newFacultyId } = req.body;
  if (!dutyId || !newFacultyId) return res.status(400).json({ error: 'Duty ID and new faculty ID required.' });

  const duty = db.prepare('SELECT * FROM duty_assignments WHERE id = ?').get(dutyId) as any;
  if (!duty) return res.status(404).json({ error: 'Duty not found' });

  const exam = db.prepare('SELECT * FROM examinations WHERE id = ?').get(duty.exam_id) as any;
  const newFaculty = db.prepare('SELECT * FROM faculty WHERE id = ?').get(newFacultyId) as any;

  // Validation: double booking on same exam date & session
  const conflict = db.prepare(`
    SELECT da.*, e.exam_name, e.exam_date, e.session_name 
    FROM duty_assignments da
    JOIN examinations e ON e.id = da.exam_id
    WHERE da.faculty_id = ? AND e.exam_date = ? AND e.session_name = ? AND da.id != ?
  `).get(newFacultyId, exam.exam_date, exam.session_name, dutyId) as any;

  if (conflict) {
    return res.status(400).json({
      error: `Conflict! ${newFaculty.name} is already assigned to "${conflict.exam_name}" on ${exam.exam_date} (${exam.session_name}).`
    });
  }

  db.prepare('UPDATE duty_assignments SET faculty_id = ? WHERE id = ?').run(newFacultyId, dutyId);
  logAudit(req.body.currentUser || 'Administrator', 'admin', 'REASSIGN_DUTY', 'DUTY_ASSIGNMENTS', dutyId, `Reassigned duty to ${newFaculty.name}`);
  res.json({ success: true, message: `Successfully reassigned duty to ${newFaculty.name}.` });
});

// ================= AUDIT LOGS =================
router.get('/audit-logs', (_req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  res.json(logs);
});

// ================= SEED RESET =================
router.post('/seed/reset', (req: Request, res: Response) => {
  seedDatabase();
  logAudit(req.body.currentUser || 'Administrator', 'admin', 'RESET_DATABASE', 'SYSTEM', null, 'Reset database to pristine sample dataset.');
  res.json({ success: true, message: 'Database reset to default college dataset successfully.' });
});
