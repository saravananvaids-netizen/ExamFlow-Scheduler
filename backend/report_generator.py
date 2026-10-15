"""
Report generator using ReportLab and OpenPyXL for college examination cell reports.
"""
import io
import pandas as pd
from typing import List, Dict, Any

def generate_seating_excel(allocations: List[Dict[str, Any]], exam_title: str) -> io.BytesIO:
    df = pd.DataFrame(allocations)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="Seating Plan")
    output.seek(0)
    return output

def generate_duty_roster_excel(duties: List[Dict[str, Any]]) -> io.BytesIO:
    df = pd.DataFrame(duties)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="Invigilation Roster")
    output.seek(0)
    return output

def generate_seating_pdf(allocations: List[Dict[str, Any]], exam_details: Dict[str, Any]) -> bytes:
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0f172a'),
            alignment=1
        )
        sub_style = ParagraphStyle(
            'SubStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#475569'),
            alignment=1
        )

        elements.append(Paragraph("APEX UNIVERSITY - CONTROLLER OF EXAMINATIONS", title_style))
        elements.append(Paragraph(f"Examination: {exam_details.get('exam_name', 'Examination Hall Seating Plan')}", sub_style))
        elements.append(Paragraph(f"Date: {exam_details.get('exam_date', '')} | Session: {exam_details.get('session_name', '')} | Time: {exam_details.get('start_time', '')} - {exam_details.get('end_time', '')}", sub_style))
        elements.append(Spacer(1, 15))

        table_data = [["S.No", "Hall", "Desk", "Reg No", "Student Name", "Dept", "Signature"]]
        for i, a in enumerate(allocations, 1):
            table_data.append([
                str(i),
                a.get("hall_code", ""),
                a.get("seat_number", ""),
                a.get("reg_no", ""),
                a.get("student_name", ""),
                a.get("department", ""),
                ""
            ])

        t = Table(table_data, colWidths=[35, 60, 75, 85, 160, 50, 75])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(t)
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        return f"PDF generation error: {str(e)}".encode('utf-8')
