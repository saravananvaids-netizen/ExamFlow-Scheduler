# Smart Exam Hall Planner & Faculty Duty Scheduler

A comprehensive, production-grade Examination Seating Allocation and Faculty Invigilation Duty Scheduling System designed for colleges and universities.

Built with **React 19 + TypeScript**, **Tailwind CSS**, **Lucide Icons**, **Recharts**, and full-stack REST APIs backed by **SQLite**. Also includes a complete **Python FastAPI** backend suite with **Pandas**, **OpenPyXL**, and **ReportLab**.

---

## 🌟 Key Features

1. **Role-Based Access Control**:
   - **Administrator**: Full administrative control over all student data, halls, faculty profiles, examination calendars, rules, and system resets.
   - **Examination Cell Staff**: Schedule examinations, run automatic student hall allocation algorithms, preview visual desk seating maps, and generate printable seating manifests.
   - **Faculty Member**: Faculty portal displaying assigned invigilation duties, hall locations, reporting times, calendar view, and duty order downloads.

2. **Smart Student Hall Allocation Engine**:
   - Capacity overflow validation preventing hall overbooking.
   - Department separation / alternating desk seating algorithm preventing side-by-side seating of students from the same department.
   - Generates 2D interactive seating matrices (Rows × Columns) with visual indicators for Occupied, Empty, and Reserved seats.
   - Live seat-by-seat inspection with student register numbers and department tags.

3. **Constraint-Based Faculty Duty Scheduler**:
   - Greedy workload-balancing algorithm with constraint satisfaction.
   - Automatic double-booking prevention across overlapping examination sessions.
   - Enforces daily duty limits (`max_duties_per_day`) and overall exam period quotas (`max_duties_period`).
   - Workload Fairness Score calculation based on standard deviation of duties.
   - Explicit failure explanations for any unassigned duty slots (no silent failures).
   - Duty locking and manual reassignment with instant conflict validation.

4. **Rich Export & Reporting**:
   - Hall-wise student seating chart (PDF & Excel/CSV).
   - Faculty-wise invigilation duty roster (PDF & Excel).
   - Examination timetable and workload fairness summary.
   - In-app printable views.

5. **Local SQLite Persistence & Audit Trail**:
   - All changes (students, halls, faculty, exams, seat assignments, duties) persist to `exam_planner.db`.
   - Comprehensive audit logging tracking all administrative actions with timestamps and user roles.

---

## 🔑 Demo Credentials

| Role | Username | Password | Full Name / Title |
|------|----------|----------|-------------------|
| **Administrator** | `admin` | `admin123` | Dr. Arthur Vance (Dean of Examinations) |
| **Exam Cell** | `exam_cell` | `exam123` | Ms. Priya Sharma (Controller of Examinations) |
| **Faculty Member** | `faculty` | `faculty123` | Dr. Rajesh Kumar (Professor, CSE) |

---

## 🚀 Running the Application

### Option A: Node.js Full-Stack (Default AI Studio Runtime)

This runs the integrated full-stack server on Port 3000 (Express API + SQLite + Vite Frontend):

```bash
# 1. Install dependencies
npm install

# 2. Run the fullstack development server
npm run dev
```

Open your browser at `http://localhost:3000`.

---

### Option B: Python FastAPI Backend + Vite React Frontend

If you wish to run the backend in Python using FastAPI, Uvicorn, Pandas, and ReportLab:

#### 1. Backend Setup (Windows / macOS / Linux)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (Command Prompt):
venv\Scripts\activate
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# Install Python requirements
pip install -r requirements.txt

# Run the FastAPI server
uvicorn main:app --reload --port 8000
```

FastAPI interactive documentation will be live at `http://localhost:8000/docs`.

#### 2. Run Python Unit Tests

```bash
cd backend
pytest test_scheduler.py -v
```

Tests verify:
- Insufficient hall capacity handling
- Department alternating allocation
- Faculty double-booking prevention
- Faculty daily and periodic workload limits

---

## 📁 Project Structure

```
├── backend/                   # Python FastAPI Backend suite
│   ├── main.py                # FastAPI routes and server
│   ├── models.py              # SQLAlchemy ORM models
│   ├── scheduler.py           # Allocation & scheduling algorithms
│   ├── report_generator.py    # ReportLab & OpenPyXL report generation
│   ├── test_scheduler.py      # Pytest automated algorithm tests
│   └── requirements.txt       # Python dependencies
├── server/                    # Node.js Express Backend & SQLite
│   ├── db.ts                  # SQLite schema & realistic university seed data
│   ├── algorithms.ts          # Seating allocation & duty assignment engine
│   └── routes.ts              # REST API endpoints
├── src/                       # React 19 Frontend application
│   ├── components/            # Reusable UI components & dialogs
│   │   ├── Navigation.tsx     # Topbar & sidebar with role badges
│   │   ├── StatCard.tsx       # Metric cards with trend badges
│   │   ├── SeatingGrid.tsx    # Visual 2D hall seating matrix
│   │   └── ImportModal.tsx    # CSV/Excel spreadsheet upload dialog
│   ├── pages/                 # Full feature views
│   │   ├── Dashboard.tsx      # Analytics, workload charts, calendar
│   │   ├── Students.tsx       # Student directory, search, CSV import/export
│   │   ├── Halls.tsx          # Hall management, accessibility, maintenance
│   │   ├── Faculty.tsx        # Faculty directory, workload limits, status
│   │   ├── Examinations.tsx   # Timetable, session filters, conflict warnings
│   │   ├── Allocation.tsx     # Seating planner, preview, confirm, visual grid
│   │   ├── DutyScheduler.tsx  # Invigilator assignment, fairness score, reassign
│   │   ├── Reports.tsx        # Printable & downloadable PDF/Excel reports
│   │   ├── FacultyPortal.tsx  # Personalized faculty duty schedule
│   │   └── Settings.tsx       # Database reset, demo switcher, audit logs
│   ├── types/                 # TypeScript interfaces
│   ├── App.tsx                # Main application router and state
│   ├── main.tsx               # Client entry point
│   └── index.css              # Tailwind CSS stylesheet
├── exam_planner.db            # Persistent SQLite database
├── server.ts                  # Main Express + Vite server entrypoint
├── package.json
└── tsconfig.json
```

---

## 🛠️ Troubleshooting

1. **Port 3000 Already in Use**:
   Ensure no background process is holding port 3000:
   - On Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
   - On Linux/macOS: `lsof -ti:3000 | xargs kill -9`

2. **Resetting to Clean Demo Data**:
   Navigate to the **Settings** tab in the top navigation or sidebar and click **Reset to Demo Data**, or send a POST request to `/api/seed/reset`.
