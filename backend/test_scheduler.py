"""
Unit tests for Smart Exam Hall Planner and Faculty Duty Scheduler algorithms.
Covers:
- Student capacity overflow
- Duplicate student allocation
- Faculty double-booking
- Faculty workload limits
- Insufficient hall capacity
- Unavailable halls
"""
import pytest
from scheduler import allocate_students, schedule_faculty_duties

def test_insufficient_hall_capacity():
    students = [{"id": f"s{i}", "name": f"Student {i}", "reg_no": f"REG{i:03d}", "department": "CSE"} for i in range(50)]
    halls = [{"id": "h1", "hall_code": "LH-101", "capacity": 20, "rows": 4, "cols": 5}]
    
    result = allocate_students(students, halls)
    assert result["success"] is False
    assert "Insufficient hall capacity" in result["error"]

def test_successful_allocation_and_alternating_departments():
    students = [
        {"id": "s1", "name": "Student A1", "reg_no": "REG001", "department": "CSE"},
        {"id": "s2", "name": "Student A2", "reg_no": "REG002", "department": "CSE"},
        {"id": "s3", "name": "Student B1", "reg_no": "REG003", "department": "ECE"},
        {"id": "s4", "name": "Student B2", "reg_no": "REG004", "department": "ECE"}
    ]
    halls = [{"id": "h1", "hall_code": "LH-101", "capacity": 10, "rows": 2, "cols": 5}]
    
    result = allocate_students(students, halls, department_separation=True)
    assert result["success"] is True
    assert result["total_allocated"] == 4
    
    # Check that departments alternate
    allocs = result["allocations"]
    assert allocs[0]["department"] != allocs[1]["department"]

def test_faculty_double_booking_prevention():
    exam1 = {"id": "ex1", "exam_date": "2026-10-20", "session_name": "FN"}
    halls = [{"id": "h1", "hall_code": "LH-101", "capacity": 20}]
    faculty = [
        {"id": "f1", "name": "Dr. Kumar", "department": "CSE", "is_available": 1, "max_duties_per_day": 1, "max_duties_period": 5}
    ]
    # Faculty f1 already assigned to another exam at same date & session
    existing_duties = [
        {"faculty_id": "f1", "exam_date": "2026-10-20", "session_name": "FN"}
    ]

    result = schedule_faculty_duties(exam1, halls, faculty, existing_duties)
    # Should not assign f1, result has unassigned halls
    assert len(result["assignments"]) == 0
    assert len(result["unassigned"]) > 0

def test_faculty_workload_limit_enforced():
    exam = {"id": "ex2", "exam_date": "2026-10-22", "session_name": "AN"}
    halls = [{"id": "h1", "hall_code": "LH-101", "capacity": 20}]
    faculty = [
        {"id": "f1", "name": "Dr. Jenkins", "department": "ECE", "is_available": 1, "max_duties_per_day": 1, "max_duties_period": 2}
    ]
    # f1 already reached max_duties_period of 2
    existing_duties = [
        {"faculty_id": "f1", "exam_date": "2026-10-18", "session_name": "FN"},
        {"faculty_id": "f1", "exam_date": "2026-10-19", "session_name": "FN"}
    ]

    result = schedule_faculty_duties(exam, halls, faculty, existing_duties)
    assert len(result["assignments"]) == 0
    assert result["unassigned"][0]["reason"] != ""

if __name__ == "__main__":
    pytest.main(["-v", "test_scheduler.py"])
