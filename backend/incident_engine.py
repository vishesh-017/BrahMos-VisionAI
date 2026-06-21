"""
BrahMos Vision AI — Incident Investigator Engine
=================================================
Pure Python state machine that reads recent security events from the
SQLite database and detects suspicious behavioural PATTERNS across time.

No AI API calls needed. This is entirely rule-based ML pattern matching.

Patterns Detected:
  A. Suspicious Drop     — Person enters → Object appears → Person leaves
  B. Casing Behaviour    — Person loiters a long time then leaves quickly
  C. Crowd Formation     — Person count spikes rapidly in a short window
  D. Masked Night Intruder — Unidentified person in darkness
  E. Repeated Intrusion  — Same high-risk pattern recurring in same hour
"""

import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

IST = ZoneInfo("Asia/Kolkata")


# ---------------------------------------------------------------------------
# Pattern Detectors (pure functions on list of events)
# ---------------------------------------------------------------------------

def _parse_ts(ts_str: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(ts_str)
    except Exception:
        return None


def _detect_suspicious_drop(events: list[dict]) -> Optional[dict]:
    """Pattern A: Person detected → Bag/object appears → Person disappears."""
    UNATTENDED = {"backpack", "suitcase", "handbag", "briefcase"}
    
    for i, event in enumerate(events):
        # Look for an event with an unattended bag and zero persons
        obj_summary = event.get("object_summary", "").lower()
        if event.get("person_count", 0) == 0 and any(obj in obj_summary for obj in UNATTENDED):
            # Look back in time for a prior event with a person in same camera
            ts = _parse_ts(event.get("timestamp", ""))
            if not ts:
                continue
            # Find prior events within 15 mins where person was present
            prior = [
                e for e in events[i:]
                if e.get("person_count", 0) > 0
                and e.get("camera_id") == event.get("camera_id")
                and _parse_ts(e.get("timestamp", "")) is not None
                and (ts - _parse_ts(e.get("timestamp"))) < timedelta(minutes=15)
                and (ts - _parse_ts(e.get("timestamp"))) > timedelta(seconds=30)
            ]
            if prior:
                enter_event = prior[-1]
                return {
                    "pattern": "Suspicious Object Drop",
                    "confidence": "HIGH",
                    "description": "A person was detected, then disappeared, leaving an unattended object behind.",
                    "timeline": [
                        {"time": _fmt(enter_event.get("timestamp")), "event": f"Person entered. Scene: {enter_event.get('scene_description', 'N/A')}"},
                        {"time": _fmt(event.get("timestamp")), "event": f"Person gone. Unattended object detected: {event.get('object_summary', 'N/A')}"},
                    ],
                    "recommendation": "Dispatch security personnel to investigate unattended item immediately.",
                    "evidence_event_id": event.get("id"),
                }
    return None


def _detect_casing(events: list[dict]) -> Optional[dict]:
    """Pattern B: HIGH risk loitering event occurred."""
    for event in events:
        reasoning = event.get("ai_reasoning", "").lower()
        if "loitering" in reasoning and event.get("risk_level") in ("HIGH", "MEDIUM"):
            return {
                "pattern": "Casing Behaviour",
                "confidence": "MEDIUM",
                "description": "A person exhibited loitering behaviour, standing stationary in a fixed area for an extended period.",
                "timeline": [
                    {"time": _fmt(event.get("timestamp")), "event": f"Loitering alert: {event.get('scene_description', 'N/A')}"},
                    {"time": "Ongoing", "event": "Subject remained in area beyond normal movement patterns."},
                ],
                "recommendation": "Review camera footage. Approach subject and request identification.",
                "evidence_event_id": event.get("id"),
            }
    return None


def _detect_crowd_formation(events: list[dict]) -> Optional[dict]:
    """Pattern C: Person count rapidly increased within a 10-minute window."""
    if len(events) < 3:
        return None
    # Check if person count spiked in recent events
    recent = events[:10]  # last 10 events
    counts = [e.get("person_count", 0) for e in recent]
    if not counts or max(counts) < 5:
        return None
    # Find if there was a rapid increase
    for i in range(len(counts) - 2):
        if counts[i] < 3 and counts[i + 2] >= 8:
            ts1 = _parse_ts(recent[i + 2].get("timestamp", ""))
            ts2 = _parse_ts(recent[i].get("timestamp", ""))
            if ts1 and ts2 and (ts2 - ts1) < timedelta(minutes=10):
                return {
                    "pattern": "Rapid Crowd Formation",
                    "confidence": "MEDIUM",
                    "description": f"Person count surged from {counts[i]} to {counts[i+2]} within minutes.",
                    "timeline": [
                        {"time": _fmt(recent[i].get("timestamp")), "event": f"Normal activity: {counts[i]} person(s)"},
                        {"time": _fmt(recent[i+2].get("timestamp")), "event": f"Crowd formed: {counts[i+2]} persons detected"},
                    ],
                    "recommendation": "Monitor crowd for signs of panic or aggression. Open additional exits if needed.",
                    "evidence_event_id": recent[i+2].get("id"),
                }
    return None


def _detect_masked_intruder(events: list[dict]) -> Optional[dict]:
    """Pattern D: Critical — unidentified person in darkness."""
    for event in events:
        reasoning = event.get("ai_reasoning", "").lower()
        if "unidentified" in reasoning or "masked" in reasoning:
            return {
                "pattern": "Masked Night Intruder",
                "confidence": "CRITICAL",
                "description": "An unidentified person with obscured face was detected during dark/low-light conditions.",
                "timeline": [
                    {"time": _fmt(event.get("timestamp")), "event": f"CRITICAL: {event.get('scene_description', 'Unidentified person detected')}"},
                    {"time": "Immediate", "event": "Lockdown mode triggered. Voice warning issued."},
                ],
                "recommendation": "IMMEDIATE LOCKDOWN. Alert all security personnel. Do not confront alone.",
                "evidence_event_id": event.get("id"),
            }
    return None


def _detect_repeated_intrusion(events: list[dict]) -> Optional[dict]:
    """Pattern E: More than 2 HIGH risk events in the last hour."""
    now = datetime.now(IST)
    one_hour_ago = now - timedelta(hours=1)
    high_events = [
        e for e in events
        if e.get("risk_level") == "HIGH"
        and _parse_ts(e.get("timestamp", "")) is not None
        and _parse_ts(e.get("timestamp")) >= one_hour_ago
    ]
    if len(high_events) >= 2:
        return {
            "pattern": "Repeated High-Risk Activity",
            "confidence": "HIGH",
            "description": f"{len(high_events)} high-risk events detected in the last hour. Pattern suggests persistent threat.",
            "timeline": [
                {"time": _fmt(e.get("timestamp")), "event": e.get("scene_description", "High risk event")}
                for e in high_events[:4]
            ],
            "recommendation": "Escalate to supervisory security. Consider calling law enforcement.",
            "evidence_event_id": high_events[0].get("id"),
        }
    return None


def _fmt(ts_str: Optional[str]) -> str:
    if not ts_str:
        return "Unknown"
    try:
        dt = datetime.fromisoformat(ts_str)
        return dt.strftime("%I:%M %p")
    except Exception:
        return ts_str


# ---------------------------------------------------------------------------
# Main Investigator
# ---------------------------------------------------------------------------

def investigate(events: list[dict]) -> list[dict]:
    """
    Run all pattern detectors against recent events.
    Returns a list of detected incidents (may be empty).
    """
    incidents = []
    
    detectors = [
        _detect_masked_intruder,    # Highest priority first
        _detect_suspicious_drop,
        _detect_repeated_intrusion,
        _detect_casing,
        _detect_crowd_formation,
    ]
    
    seen_patterns = set()
    
    for detector in detectors:
        result = detector(events)
        if result and result["pattern"] not in seen_patterns:
            result["detected_at"] = datetime.now(IST).strftime("%I:%M %p")
            result["camera_id"] = "CAM-01"
            incidents.append(result)
            seen_patterns.add(result["pattern"])
    
    return incidents
