import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'exam_planner.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      department TEXT,
      faculty_id TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      reg_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      year INTEGER NOT NULL,
      eligible_subjects TEXT,
      email TEXT,
      status TEXT DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS halls (
      id TEXT PRIMARY KEY,
      hall_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      building TEXT NOT NULL,
      floor INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      rows INTEGER NOT NULL,
      cols INTEGER NOT NULL,
      is_accessible INTEGER DEFAULT 1,
      is_available INTEGER DEFAULT 1,
      maintenance_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id TEXT PRIMARY KEY,
      faculty_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      designation TEXT NOT NULL,
      max_duties_per_day INTEGER DEFAULT 1,
      max_duties_period INTEGER DEFAULT 6,
      preferred_sessions TEXT,
      unavailable_sessions TEXT,
      is_available INTEGER DEFAULT 1,
      special_qualification TEXT
    );

    CREATE TABLE IF NOT EXISTS examinations (
      id TEXT PRIMARY KEY,
      exam_code TEXT UNIQUE NOT NULL,
      exam_name TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      exam_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      session_name TEXT NOT NULL,
      total_eligible_students INTEGER DEFAULT 0,
      required_invigilators_per_hall INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Draft'
    );

    CREATE TABLE IF NOT EXISTS student_allocations (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      hall_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      row_index INTEGER NOT NULL,
      col_index INTEGER NOT NULL,
      is_confirmed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(exam_id) REFERENCES examinations(id) ON DELETE CASCADE,
      FOREIGN KEY(hall_id) REFERENCES halls(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS duty_assignments (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      hall_id TEXT NOT NULL,
      faculty_id TEXT NOT NULL,
      duty_type TEXT NOT NULL,
      reporting_time TEXT NOT NULL,
      status TEXT DEFAULT 'Assigned',
      is_locked INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(exam_id) REFERENCES examinations(id) ON DELETE CASCADE,
      FOREIGN KEY(hall_id) REFERENCES halls(id) ON DELETE CASCADE,
      FOREIGN KEY(faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL
    );
  `);

  // Seed sample data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedDatabase();
  }
}

export function seedDatabase() {
  // Clear existing
  db.exec(`
    DELETE FROM duty_assignments;
    DELETE FROM student_allocations;
    DELETE FROM audit_logs;
    DELETE FROM examinations;
    DELETE FROM faculty;
    DELETE FROM halls;
    DELETE FROM students;
    DELETE FROM users;
  `);

  // Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password, name, role, email, department, faculty_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('usr-1', 'admin', 'admin123', 'Dr. Arthur Vance', 'admin', 'admin@apexuniversity.edu', 'Exam Administration', null);
  insertUser.run('usr-2', 'exam_cell', 'exam123', 'Ms. Priya Sharma', 'exam_cell', 'priya.exam@apexuniversity.edu', 'Controller of Examinations', null);
  insertUser.run('usr-3', 'faculty', 'faculty123', 'Dr. Rajesh Kumar', 'faculty', 'rajesh.kumar@apexuniversity.edu', 'Computer Science & Engineering', 'FAC-CSE-01');

  // Insert Halls
  const insertHall = db.prepare(`
    INSERT INTO halls (id, hall_code, name, building, floor, capacity, rows, cols, is_accessible, is_available, maintenance_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertHall.run('hall-1', 'LH-101', 'Lecture Hall 101', 'Main Academic Block', 1, 24, 4, 6, 1, 1, null);
  insertHall.run('hall-2', 'LH-102', 'Lecture Hall 102', 'Main Academic Block', 1, 24, 4, 6, 1, 1, null);
  insertHall.run('hall-3', 'AUD-201', 'Ramanujan Memorial Hall', 'Science & Library Complex', 2, 48, 6, 8, 1, 1, null);
  insertHall.run('hall-4', 'ENG-105', 'Engineering Hall 105', 'APJ Abdul Kalam Block', 1, 16, 4, 4, 1, 1, null);
  insertHall.run('hall-5', 'SCI-301', 'Science Lecture Hall 301', 'Science & Library Complex', 3, 20, 4, 5, 0, 1, null);
  insertHall.run('hall-6', 'SEM-002', 'Seminar Hall B', 'Administrative Block', 0, 18, 3, 6, 1, 0, 'HVAC maintenance scheduled');

  // Insert Faculty
  const insertFaculty = db.prepare(`
    INSERT INTO faculty (id, faculty_id, name, department, email, phone, designation, max_duties_per_day, max_duties_period, preferred_sessions, unavailable_sessions, is_available, special_qualification)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const facultyData = [
    ['fac-1', 'FAC-CSE-01', 'Dr. Rajesh Kumar', 'Computer Science & Engineering', 'rajesh.kumar@apexuniversity.edu', '+91 98401 23451', 'Professor', 1, 5, '["FN"]', '[]', 1, 'Chief Invigilator Certified'],
    ['fac-2', 'FAC-CSE-02', 'Dr. Sarah Jenkins', 'Computer Science & Engineering', 'sarah.j@apexuniversity.edu', '+91 98401 23452', 'Associate Professor', 1, 6, '[]', '[]', 1, 'Disciplinary Committee Member'],
    ['fac-3', 'FAC-CSE-03', 'Mr. Amit Patel', 'Computer Science & Engineering', 'amit.patel@apexuniversity.edu', '+91 98401 23453', 'Assistant Professor', 2, 8, '["FN", "AN"]', '[]', 1, null],
    ['fac-4', 'FAC-ECE-01', 'Dr. Sundaram Nathan', 'Electronics & Communication', 'sundaram.n@apexuniversity.edu', '+91 98401 23454', 'Professor & HOD', 1, 4, '["FN"]', '[]', 1, 'Flying Squad Head'],
    ['fac-5', 'FAC-ECE-02', 'Ms. Meenakshi Sundar', 'Electronics & Communication', 'meenakshi.s@apexuniversity.edu', '+91 98401 23455', 'Assistant Professor', 1, 6, '[]', '["2026-10-22-FN"]', 1, null],
    ['fac-6', 'FAC-ECE-03', 'Dr. David Wilson', 'Electronics & Communication', 'david.w@apexuniversity.edu', '+91 98401 23456', 'Associate Professor', 1, 5, '[]', '[]', 1, null],
    ['fac-7', 'FAC-MECH-01', 'Dr. Ramesh Chandran', 'Mechanical Engineering', 'ramesh.c@apexuniversity.edu', '+91 98401 23457', 'Professor', 1, 5, '[]', '[]', 1, 'Senior Invigilator'],
    ['fac-8', 'FAC-MECH-02', 'Mr. Vikram Verma', 'Mechanical Engineering', 'vikram.v@apexuniversity.edu', '+91 98401 23458', 'Assistant Professor', 2, 7, '[]', '[]', 1, null],
    ['fac-9', 'FAC-IT-01', 'Dr. Kavitha Raman', 'Information Technology', 'kavitha.r@apexuniversity.edu', '+91 98401 23459', 'Associate Professor', 1, 6, '[]', '[]', 1, null],
    ['fac-10', 'FAC-IT-02', 'Mr. Arun Prakash', 'Information Technology', 'arun.p@apexuniversity.edu', '+91 98401 23460', 'Assistant Professor', 2, 8, '[]', '[]', 1, null],
    ['fac-11', 'FAC-MATH-01', 'Dr. Nirmala Devi', 'Mathematics & Basic Sciences', 'nirmala.d@apexuniversity.edu', '+91 98401 23461', 'Professor', 1, 5, '["FN"]', '[]', 1, 'Exam Squad'],
    ['fac-12', 'FAC-PHY-01', 'Dr. Robert Chen', 'Physics & Materials', 'robert.c@apexuniversity.edu', '+91 98401 23462', 'Assistant Professor', 1, 6, '[]', '[]', 0, 'On Sabbatical']
  ];

  for (const f of facultyData) {
    insertFaculty.run(...f);
  }

  // Insert Students (40 students across CSE, ECE, MECH, IT)
  const insertStudent = db.prepare(`
    INSERT INTO students (id, reg_no, name, department, semester, year, eligible_subjects, email, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const studentData: Array<[string, string, string, string, number, number, string, string, string]> = [
    // CSE (15 students)
    ['std-1', '2026CSE001', 'Aarav Sharma', 'CSE', 5, 3, '["CS301", "CS403"]', 'aarav.2026@apex.edu', 'Active'],
    ['std-2', '2026CSE002', 'Aditi Verma', 'CSE', 5, 3, '["CS301", "CS403"]', 'aditi.2026@apex.edu', 'Active'],
    ['std-3', '2026CSE003', 'Ananya Gupta', 'CSE', 5, 3, '["CS301", "CS403"]', 'ananya.2026@apex.edu', 'Active'],
    ['std-4', '2026CSE004', 'Aryan Nair', 'CSE', 5, 3, '["CS301", "CS403"]', 'aryan.2026@apex.edu', 'Active'],
    ['std-5', '2026CSE005', 'Bhavya Patel', 'CSE', 5, 3, '["CS301", "CS403"]', 'bhavya.2026@apex.edu', 'Active'],
    ['std-6', '2026CSE006', 'Chetan Kumar', 'CSE', 5, 3, '["CS301", "CS403"]', 'chetan.2026@apex.edu', 'Active'],
    ['std-7', '2026CSE007', 'Deepa Iyer', 'CSE', 5, 3, '["CS301", "CS403"]', 'deepa.2026@apex.edu', 'Active'],
    ['std-8', '2026CSE008', 'Devansh Joshi', 'CSE', 5, 3, '["CS301", "CS403"]', 'devansh.2026@apex.edu', 'Active'],
    ['std-9', '2026CSE009', 'Esha Rao', 'CSE', 5, 3, '["CS301", "CS403"]', 'esha.2026@apex.edu', 'Active'],
    ['std-10', '2026CSE010', 'Farhan Ali', 'CSE', 5, 3, '["CS301", "CS403"]', 'farhan.2026@apex.edu', 'Active'],
    ['std-11', '2026CSE011', 'Gaurav Kulkarni', 'CSE', 5, 3, '["CS301", "CS403"]', 'gaurav.2026@apex.edu', 'Active'],
    ['std-12', '2026CSE012', 'Harini Swaminathan', 'CSE', 5, 3, '["CS301", "CS403"]', 'harini.2026@apex.edu', 'Active'],
    ['std-13', '2026CSE013', 'Ishaan Malhotra', 'CSE', 5, 3, '["CS301", "CS403"]', 'ishaan.2026@apex.edu', 'Active'],
    ['std-14', '2026CSE014', 'Jaya Krishna', 'CSE', 5, 3, '["CS301", "CS403"]', 'jaya.2026@apex.edu', 'Active'],
    ['std-15', '2026CSE015', 'Karan Mehra', 'CSE', 5, 3, '["CS301", "CS403"]', 'karan.2026@apex.edu', 'Active'],

    // IT (10 students)
    ['std-16', '2026IT001', 'Lavanya Sundar', 'IT', 5, 3, '["CS301", "IT302"]', 'lavanya.2026@apex.edu', 'Active'],
    ['std-17', '2026IT002', 'Madhav Nambiar', 'IT', 5, 3, '["CS301", "IT302"]', 'madhav.2026@apex.edu', 'Active'],
    ['std-18', '2026IT003', 'Neha Singhal', 'IT', 5, 3, '["CS301", "IT302"]', 'neha.2026@apex.edu', 'Active'],
    ['std-19', '2026IT004', 'Nikhil Reddy', 'IT', 5, 3, '["CS301", "IT302"]', 'nikhil.2026@apex.edu', 'Active'],
    ['std-20', '2026IT005', 'Pooja Hegde', 'IT', 5, 3, '["CS301", "IT302"]', 'pooja.2026@apex.edu', 'Active'],
    ['std-21', '2026IT006', 'Pranav Menon', 'IT', 5, 3, '["CS301", "IT302"]', 'pranav.2026@apex.edu', 'Active'],
    ['std-22', '2026IT007', 'Rhea Chakraborty', 'IT', 5, 3, '["CS301", "IT302"]', 'rhea.2026@apex.edu', 'Active'],
    ['std-23', '2026IT008', 'Rohan Sengupta', 'IT', 5, 3, '["CS301", "IT302"]', 'rohan.2026@apex.edu', 'Active'],
    ['std-24', '2026IT009', 'Sanjana Pillai', 'IT', 5, 3, '["CS301", "IT302"]', 'sanjana.2026@apex.edu', 'Active'],
    ['std-25', '2026IT010', 'Siddharth Roy', 'IT', 5, 3, '["CS301", "IT302"]', 'siddharth.2026@apex.edu', 'Active'],

    // ECE (10 students)
    ['std-26', '2026ECE001', 'Sneha Kapoor', 'ECE', 5, 3, '["EC402"]', 'sneha.2026@apex.edu', 'Active'],
    ['std-27', '2026ECE002', 'Sriram Venkat', 'ECE', 5, 3, '["EC402"]', 'sriram.2026@apex.edu', 'Active'],
    ['std-28', '2026ECE003', 'Swati Deshmukh', 'ECE', 5, 3, '["EC402"]', 'swati.2026@apex.edu', 'Active'],
    ['std-29', '2026ECE004', 'Tanmay Agarwal', 'ECE', 5, 3, '["EC402"]', 'tanmay.2026@apex.edu', 'Active'],
    ['std-30', '2026ECE005', 'Tarun Bhatia', 'ECE', 5, 3, '["EC402"]', 'tarun.2026@apex.edu', 'Active'],
    ['std-31', '2026ECE006', 'Varun Nair', 'ECE', 5, 3, '["EC402"]', 'varun.2026@apex.edu', 'Active'],
    ['std-32', '2026ECE007', 'Vidya Balan', 'ECE', 5, 3, '["EC402"]', 'vidya.2026@apex.edu', 'Active'],
    ['std-33', '2026ECE008', 'Vivek Chauhan', 'ECE', 5, 3, '["EC402"]', 'vivek.2026@apex.edu', 'Active'],
    ['std-34', '2026ECE009', 'Yashvardhan Jain', 'ECE', 5, 3, '["EC402"]', 'yash.2026@apex.edu', 'Active'],
    ['std-35', '2026ECE010', 'Zoya Sheikh', 'ECE', 5, 3, '["EC402"]', 'zoya.2026@apex.edu', 'Active'],

    // MECH (8 students)
    ['std-36', '2026MECH001', 'Abhinav Saxena', 'MECH', 5, 3, '["ME305"]', 'abhinav.2026@apex.edu', 'Active'],
    ['std-37', '2026MECH002', 'Bharat Mani', 'MECH', 5, 3, '["ME305"]', 'bharat.2026@apex.edu', 'Active'],
    ['std-38', '2026MECH003', 'Chirag Sethi', 'MECH', 5, 3, '["ME305"]', 'chirag.2026@apex.edu', 'Active'],
    ['std-39', '2026MECH004', 'Dinesh Karthik', 'MECH', 5, 3, '["ME305"]', 'dinesh.2026@apex.edu', 'Active'],
    ['std-40', '2026MECH005', 'Harsh Goel', 'MECH', 5, 3, '["ME305"]', 'harsh.2026@apex.edu', 'Active'],
    ['std-41', '2026MECH006', 'Jitendra Rawat', 'MECH', 5, 3, '["ME305"]', 'jitendra.2026@apex.edu', 'Active'],
    ['std-42', '2026MECH007', 'Manish Pandey', 'MECH', 5, 3, '["ME305"]', 'manish.2026@apex.edu', 'Active'],
    ['std-43', '2026MECH008', 'Naveen Kumar', 'MECH', 5, 3, '["ME305"]', 'naveen.2026@apex.edu', 'Active']
  ];

  for (const s of studentData) {
    insertStudent.run(...s);
  }

  // Insert Examinations
  const insertExam = db.prepare(`
    INSERT INTO examinations (id, exam_code, exam_name, subject_code, subject_name, department, semester, exam_date, start_time, end_time, session_name, total_eligible_students, required_invigilators_per_hall, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertExam.run(
    'exam-1',
    'EX2026-01',
    'Fall Semester Midterm: Data Structures & Algorithms',
    'CS301',
    'Data Structures & Algorithms',
    'CSE, IT',
    5,
    '2026-10-20',
    '09:30',
    '12:30',
    'FN',
    25,
    1,
    'Confirmed'
  );

  insertExam.run(
    'exam-2',
    'EX2026-02',
    'Fall Semester Midterm: Digital Signal Processing',
    'EC402',
    'Digital Signal Processing',
    'ECE',
    5,
    '2026-10-21',
    '14:00',
    '17:00',
    'AN',
    10,
    1,
    'Draft'
  );

  insertExam.run(
    'exam-3',
    'EX2026-03',
    'Fall Semester Midterm: Thermodynamics & Heat Transfer',
    'ME305',
    'Thermodynamics & Heat Transfer',
    'MECH',
    5,
    '2026-10-22',
    '09:30',
    '12:30',
    'FN',
    8,
    1,
    'Draft'
  );

  insertExam.run(
    'exam-4',
    'EX2026-04',
    'Fall Semester Final: Database Management Systems',
    'CS403',
    'Database Management Systems',
    'CSE',
    5,
    '2026-10-24',
    '09:30',
    '12:30',
    'FN',
    15,
    1,
    'Draft'
  );

  // Allocate exam-1 into LH-101 (24 capacity) and LH-102 (remaining 1)
  const insertAlloc = db.prepare(`
    INSERT INTO student_allocations (id, exam_id, hall_id, student_id, seat_number, row_index, col_index, is_confirmed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // First 24 eligible students for CS301 into LH-101 (std-1 through std-15 and std-16 through std-24)
  const now = new Date().toISOString();
  let seatIdx = 1;
  for (let i = 1; i <= 24; i++) {
    const student = studentData[i - 1];
    const r = Math.floor((seatIdx - 1) / 6);
    const c = (seatIdx - 1) % 6;
    insertAlloc.run(
      `alloc-${i}`,
      'exam-1',
      'hall-1',
      student[0],
      `LH101-R${r + 1}C${c + 1}`,
      r,
      c,
      1,
      now
    );
    seatIdx++;
  }
  // 25th student into LH-102
  insertAlloc.run(
    'alloc-25',
    'exam-1',
    'hall-2',
    studentData[24][0],
    'LH102-R1C1',
    0,
    0,
    1,
    now
  );

  // Duty assignment for exam-1:
  // hall-1 gets fac-1 (Dr. Rajesh Kumar) and fac-5 (Ms. Meenakshi Sundar)
  // hall-2 gets fac-7 (Dr. Ramesh Chandran)
  const insertDuty = db.prepare(`
    INSERT INTO duty_assignments (id, exam_id, hall_id, faculty_id, duty_type, reporting_time, status, is_locked, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDuty.run('duty-1', 'exam-1', 'hall-1', 'fac-1', 'Chief Invigilator', '08:45 AM', 'Confirmed', 1, 'Main hall supervisor', now);
  insertDuty.run('duty-2', 'exam-1', 'hall-2', 'fac-7', 'Hall Invigilator', '09:00 AM', 'Confirmed', 0, 'Standard invigilation', now);

  // Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, entity, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run('audit-1', new Date(Date.now() - 86400000 * 2).toISOString(), 'Dr. Arthur Vance', 'admin', 'INITIALIZE', 'SYSTEM', null, 'System configured with 6 examination halls and 12 faculty members.');
  insertAudit.run('audit-2', new Date(Date.now() - 86400000).toISOString(), 'Ms. Priya Sharma', 'exam_cell', 'CREATE_EXAM', 'EXAMINATIONS', 'exam-1', 'Created Fall Semester Midterm: Data Structures & Algorithms (CS301).');
  insertAudit.run('audit-3', new Date(Date.now() - 3600000 * 4).toISOString(), 'Ms. Priya Sharma', 'exam_cell', 'ALLOCATION_GENERATE', 'STUDENT_ALLOCATIONS', 'exam-1', 'Generated and confirmed seating allocation for 25 students across LH-101 & LH-102.');
  insertAudit.run('audit-4', new Date(Date.now() - 3600000 * 2).toISOString(), 'Dr. Arthur Vance', 'admin', 'DUTY_ASSIGNMENT', 'DUTY_ASSIGNMENTS', 'exam-1', 'Assigned invigilators Dr. Rajesh Kumar and Dr. Ramesh Chandran to halls.');
}
