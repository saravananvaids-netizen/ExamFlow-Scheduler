import math
import json
from typing import List, Dict, Any, Optional

def allocate_students(
    eligible_students: List[Dict[str, Any]],
    available_halls: List[Dict[str, Any]],
    department_separation: bool = True
) -> Dict[str, Any]:
    """
    Allocates students to available halls checking capacity and desk rows/cols.
    Supports alternating department allocation.
    """
    total_capacity = sum(h["capacity"] for h in available_halls)
    total_students = len(eligible_students)

    if total_capacity < total_students:
        return {
            "success": False,
            "error": f"Insufficient hall capacity! Required: {total_students}, Available: {total_capacity}. Deficit: {total_students - total_capacity} seats."
        }

    # Department separation round-robin queue
    student_queue = []
    if department_separation:
        dept_map = {}
        for s in eligible_students:
            dept = s.get("department", "GEN")
            dept_map.setdefault(dept, []).append(s)
        
        dept_keys = list(dept_map.keys())
        idx = 0
        done = False
        while not done:
            done = True
            for d in dept_keys:
                if len(dept_map[d]) > idx:
                    student_queue.append(dept_map[d][idx])
                    done = False
            idx += 1
    else:
        student_queue = list(eligible_students)

    allocations = []
    hall_summaries = []
    student_idx = 0

    for hall in available_halls:
        if student_idx >= len(student_queue):
            break

        hall_alloc_count = 0
        hall_capacity = hall["capacity"]
        rows = hall.get("rows", 4)
        cols = hall.get("cols", 6)

        for r in range(rows):
            for c in range(cols):
                if hall_alloc_count >= hall_capacity or student_idx >= len(student_queue):
                    break

                student = student_queue[student_idx]
                seat_num = f"{hall['hall_code']}-R{r+1}C{c+1}"

                allocations.append({
                    "student_id": student["id"],
                    "student_name": student["name"],
                    "reg_no": student["reg_no"],
                    "department": student["department"],
                    "hall_id": hall["id"],
                    "hall_code": hall["hall_code"],
                    "seat_number": seat_num,
                    "row_index": r,
                    "col_index": c
                })

                hall_alloc_count += 1
                student_idx += 1

            if hall_alloc_count >= hall_capacity or student_idx >= len(student_queue):
                break

        hall_summaries.append({
            "hall_id": hall["id"],
            "hall_code": hall["hall_code"],
            "capacity": hall_capacity,
            "allocated": hall_alloc_count,
            "vacant": hall_capacity - hall_alloc_count
        })

    return {
        "success": True,
        "total_allocated": len(allocations),
        "allocations": allocations,
        "hall_summaries": hall_summaries
    }

def schedule_faculty_duties(
    exam: Dict[str, Any],
    halls: List[Dict[str, Any]],
    all_faculty: List[Dict[str, Any]],
    existing_duties: List[Dict[str, Any]],
    department_separation: bool = True
) -> Dict[str, Any]:
    """
    Constraint-based greedy faculty duty assignment.
    Validates double-booking, daily workload limits, and period limits.
    """
    # Track current duty counts
    period_duties = {f["id"]: 0 for f in all_faculty}
    day_duties = {f["id"]: 0 for f in all_faculty}
    assigned_this_exam = set()

    for d in existing_duties:
        fid = d["faculty_id"]
        period_duties[fid] = period_duties.get(fid, 0) + 1
        if d.get("exam_date") == exam["exam_date"]:
            day_duties[fid] = day_duties.get(fid, 0) + 1

    assignments = []
    unassigned = []

    for hall in halls:
        slots_needed = 2 if hall.get("capacity", 0) > 35 else 1

        for slot in range(slots_needed):
            duty_type = "Chief Invigilator" if (slot == 0 and hall.get("capacity", 0) >= 24) else "Hall Invigilator"
            
            candidates = []
            for f in all_faculty:
                if f["id"] in assigned_this_exam:
                    continue
                if not f.get("is_available", 1):
                    continue
                # Overlap check
                has_overlap = any(
                    d["faculty_id"] == f["id"] and 
                    d.get("exam_date") == exam["exam_date"] and 
                    d.get("session_name") == exam["session_name"]
                    for d in existing_duties
                )
                if has_overlap:
                    continue

                # Quota checks
                if day_duties.get(f["id"], 0) >= f.get("max_duties_per_day", 1):
                    continue
                if period_duties.get(f["id"], 0) >= f.get("max_duties_period", 6):
                    continue

                candidates.append(f)

            if not candidates:
                unassigned.append({
                    "hall_id": hall["id"],
                    "hall_code": hall["hall_code"],
                    "duty_type": duty_type,
                    "reason": "No faculty available meeting daily and period quota limits"
                })
                continue

            # Sort candidates by current workload (lowest first)
            candidates.sort(key=lambda x: period_duties[x["id"]])

            selected = candidates[0]
            assigned_this_exam.add(selected["id"])
            period_duties[selected["id"]] += 1
            day_duties[selected["id"]] += 1

            assignments.append({
                "exam_id": exam["id"],
                "hall_id": hall["id"],
                "hall_code": hall["hall_code"],
                "faculty_id": selected["id"],
                "faculty_name": selected["name"],
                "faculty_dept": selected["department"],
                "duty_type": duty_type,
                "reporting_time": "08:45 AM" if exam.get("session_name") == "FN" else "01:15 PM"
            })

    # Calculate fairness score (0-100%)
    counts = list(period_duties.values())
    avg = sum(counts) / (len(counts) or 1)
    variance = sum((c - avg) ** 2 for c in counts) / (len(counts) or 1)
    std_dev = math.sqrt(variance)
    fairness_score = max(10, min(100, int(100 - (std_dev * 18))))

    return {
        "success": len(unassigned) == 0,
        "assignments": assignments,
        "unassigned": unassigned,
        "fairness_score": fairness_score
    }
