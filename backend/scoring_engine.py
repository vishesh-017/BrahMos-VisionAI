"""
BrahMos Vision AI — Security Score Engine
==========================================
Pure mathematical formula that reads today's events and produces
a 0-100 "Campus Safety Score" with breakdown and recommendations.

No AI API calls. 100% deterministic math.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

# Score deductions per event type
DEDUCTIONS = {
    "high_risk_event": 15,
    "medium_risk_event": 5,
    "loitering": 8,
    "masked_intruder": 20,
    "unattended_object": 10,
    "crowd_formation": 7,
    "night_intrusion": 12,
}


def compute_score(events: list[dict]) -> dict:
    """
    Compute a 0-100 safety score from today's events.
    Returns a dict with score, grade, issues, and recommendations.
    """
    score = 100
    issues: list[str] = []
    details: dict = {k: 0 for k in DEDUCTIONS}
    
    high_count = 0
    medium_count = 0

    for event in events:
        risk = event.get("risk_level", "LOW")
        reasoning = event.get("ai_reasoning", "").lower()
        obj_summary = event.get("object_summary", "").lower()

        if risk == "HIGH":
            score -= DEDUCTIONS["high_risk_event"]
            details["high_risk_event"] += 1
            high_count += 1

        elif risk == "MEDIUM":
            score -= DEDUCTIONS["medium_risk_event"]
            details["medium_risk_event"] += 1
            medium_count += 1

        if "loitering" in reasoning:
            score -= DEDUCTIONS["loitering"]
            details["loitering"] += 1

        if "unidentified" in reasoning or "masked" in reasoning:
            score -= DEDUCTIONS["masked_intruder"]
            details["masked_intruder"] += 1

        if any(obj in obj_summary for obj in ["backpack", "suitcase", "handbag"]) and event.get("person_count", 0) == 0:
            score -= DEDUCTIONS["unattended_object"]
            details["unattended_object"] += 1

        if event.get("person_count", 0) >= 8:
            score -= DEDUCTIONS["crowd_formation"]
            details["crowd_formation"] += 1

        if "night" in reasoning or "night-time" in reasoning:
            score -= DEDUCTIONS["night_intrusion"]
            details["night_intrusion"] += 1

    score = max(0, min(100, score))

    # Build issues list
    if details["masked_intruder"] > 0:
        issues.append(f"{details['masked_intruder']} masked/unidentified intruder incident(s)")
    if details["high_risk_event"] > 0:
        issues.append(f"{details['high_risk_event']} HIGH risk event(s)")
    if details["loitering"] > 0:
        issues.append(f"{details['loitering']} loitering incident(s)")
    if details["unattended_object"] > 0:
        issues.append(f"{details['unattended_object']} unattended object(s) detected")
    if details["crowd_formation"] > 0:
        issues.append(f"{details['crowd_formation']} crowd formation event(s)")
    if details["medium_risk_event"] > 0:
        issues.append(f"{details['medium_risk_event']} MEDIUM risk event(s)")

    if not issues:
        issues.append("No security incidents detected today")

    # Grade
    if score >= 90:
        grade = "A"
        status = "Excellent"
        color = "green"
    elif score >= 75:
        grade = "B"
        status = "Good"
        color = "teal"
    elif score >= 60:
        grade = "C"
        status = "Fair"
        color = "amber"
    elif score >= 40:
        grade = "D"
        status = "Poor"
        color = "orange"
    else:
        grade = "F"
        status = "Critical"
        color = "red"

    # Recommendations
    recommendations: list[str] = []
    if details["masked_intruder"] > 0:
        recommendations.append("Install additional lighting at entry points")
    if details["loitering"] > 0:
        recommendations.append("Increase patrol frequency in loitering zones")
    if details["crowd_formation"] > 0:
        recommendations.append("Open additional entry/exit gates during peak hours")
    if details["unattended_object"] > 0:
        recommendations.append("Brief staff on unattended object reporting protocol")
    if not recommendations:
        recommendations.append("Maintain current security posture")

    now = datetime.now(IST)

    return {
        "score": score,
        "grade": grade,
        "status": status,
        "color": color,
        "issues": issues,
        "recommendations": recommendations,
        "details": details,
        "high_events_today": high_count,
        "medium_events_today": medium_count,
        "total_events_today": len(events),
        "computed_at": now.strftime("%I:%M %p, %d %b"),
    }
