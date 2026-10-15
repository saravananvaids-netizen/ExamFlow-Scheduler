from sqlalchemy import Column, String, Integer, Text, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import json

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False) # admin, exam_cell, faculty
    email = Column(String, nullable=False)
    department = Column(String, nullable=True)
    faculty_id = Column(String, nullable=True)

class Student(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True)
    reg_no = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    eligible_subjects = Column(Text, default="[]")
    email = Column(String, nullable=True)
    status = Column(String, default="Active")

class Hall(Base):
    __tablename__ = "halls"
    id = Column(String, primary_key=True)
    hall_code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    building = Column(String, nullable=False)
    floor = Column(Integer, nullable=False)
    capacity = Column(Integer, nullable=False)
    rows = Column(Integer, nullable=False)
    cols = Column(Integer, nullable=False)
    is_accessible = Column(Integer, default=1)
    is_available = Column(Integer, default=1)
    maintenance_notes = Column(Text, nullable=True)

class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(String, primary_key=True)
    faculty_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    max_duties_per_day = Column(Integer, default=1)
    max_duties_period = Column(Integer, default=6)
    preferred_sessions = Column(Text, default="[]")
    unavailable_sessions = Column(Text, default="[]")
    is_available = Column(Integer, default=1)
    special_qualification = Column(String, nullable=True)

class Examination(Base):
    __tablename__ = "examinations"
    id = Column(String, primary_key=True)
    exam_code = Column(String, unique=True, nullable=False)
    exam_name = Column(String, nullable=False)
    subject_code = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    exam_date = Column(String, nullable=False) # YYYY-MM-DD
    start_time = Column(String, nullable=False) # HH:MM
    end_time = Column(String, nullable=False)   # HH:MM
    session_name = Column(String, nullable=False) # FN, AN
    total_eligible_students = Column(Integer, default=0)
    required_invigilators_per_hall = Column(Integer, default=1)
    status = Column(String, default="Draft") # Draft, Allocated, Confirmed, Completed, Cancelled

class StudentAllocation(Base):
    __tablename__ = "student_allocations"
    id = Column(String, primary_key=True)
    exam_id = Column(String, ForeignKey("examinations.id"), nullable=False)
    hall_id = Column(String, ForeignKey("halls.id"), nullable=False)
    student_id = Column(String, ForeignKey("students.id"), nullable=False)
    seat_number = Column(String, nullable=False)
    row_index = Column(Integer, nullable=False)
    col_index = Column(Integer, nullable=False)
    is_confirmed = Column(Integer, default=0)
    created_at = Column(String, nullable=False)

class DutyAssignment(Base):
    __tablename__ = "duty_assignments"
    id = Column(String, primary_key=True)
    exam_id = Column(String, ForeignKey("examinations.id"), nullable=False)
    hall_id = Column(String, ForeignKey("halls.id"), nullable=False)
    faculty_id = Column(String, ForeignKey("faculty.id"), nullable=False)
    duty_type = Column(String, nullable=False)
    reporting_time = Column(String, nullable=False)
    status = Column(String, default="Assigned")
    is_locked = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True)
    timestamp = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    user_role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    details = Column(Text, nullable=False)
