from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from models import Base, User, Student, Hall, Faculty, Examination, StudentAllocation, DutyAssignment, AuditLog
from scheduler import allocate_students, schedule_faculty_duties
from report_generator import generate_seating_pdf, generate_seating_excel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.responses import Response

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./exam_planner.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI(title="Smart Exam Hall Planner & Faculty Duty Scheduler API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "Smart Exam Hall Planner & Faculty Duty Scheduler",
        "version": "1.0.0",
        "documentation": "/docs"
    }

@app.get("/api/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()
    total_halls = db.query(Hall).count()
    available_halls = db.query(Hall).filter(Hall.is_available == 1).count()
    total_faculty = db.query(Faculty).count()
    upcoming_exams = db.query(Examination).filter(Examination.status != "Completed").count()
    total_duties = db.query(DutyAssignment).count()
    return {
        "totalStudents": total_students,
        "totalHalls": total_halls,
        "availableHalls": available_halls,
        "totalFaculty": total_faculty,
        "upcomingExams": upcoming_exams,
        "totalDuties": total_duties
    }

@app.get("/api/students")
def get_students(db: Session = Depends(get_db)):
    return db.query(Student).all()

@app.get("/api/halls")
def get_halls(db: Session = Depends(get_db)):
    return db.query(Hall).all()

@app.get("/api/faculty")
def get_faculty(db: Session = Depends(get_db)):
    return db.query(Faculty).all()

@app.get("/api/examinations")
def get_examinations(db: Session = Depends(get_db)):
    return db.query(Examination).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
