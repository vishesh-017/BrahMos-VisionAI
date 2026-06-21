"""
BrahMos Vision AI — Memory System (SQLite Database)
====================================================
Stores all security events, detections, and AI decisions
for forensic analysis and historical querying.
"""

import os
import uuid
import json
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

from sqlalchemy import (
    Column, String, Float, Integer, Text, DateTime,
    create_engine, desc,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------
DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "brahmos_vision.db")

SNAPSHOTS_DIR = os.path.join(DB_DIR, "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class SecurityEvent(Base):
    """A single security event detected and analysed by the system."""

    __tablename__ = "security_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=lambda: datetime.now(ZoneInfo('Asia/Kolkata')))
    camera_id = Column(String, default="CAM-01")

    # Detection data
    detected_objects = Column(Text, default="")          # JSON list
    person_count = Column(Integer, default=0)
    object_summary = Column(Text, default="")

    # AI reasoning
    scene_description = Column(Text, default="")
    risk_level = Column(String, default="LOW")           # LOW | MEDIUM | HIGH
    risk_score = Column(Float, default=0.0)              # 0.0 – 1.0
    ai_reasoning = Column(Text, default="")
    suggested_action = Column(Text, default="")

    # Snapshot
    snapshot_path = Column(String, nullable=True)
    snapshot_hash = Column(String, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "camera_id": self.camera_id,
            "detected_objects": self.detected_objects,
            "person_count": self.person_count,
            "object_summary": self.object_summary,
            "scene_description": self.scene_description,
            "risk_level": self.risk_level,
            "risk_score": self.risk_score,
            "ai_reasoning": self.ai_reasoning,
            "suggested_action": self.suggested_action,
            "snapshot_path": self.snapshot_path,
            "snapshot_hash": self.snapshot_hash,
        }


class Incident(Base):
    """An AI-investigated security incident with a detected behavioural pattern."""

    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=lambda: datetime.now(ZoneInfo('Asia/Kolkata')))
    camera_id = Column(String, default="CAM-01")
    pattern = Column(String, default="")           # e.g. "Suspicious Drop"
    confidence = Column(String, default="MEDIUM")  # CRITICAL | HIGH | MEDIUM | LOW
    description = Column(Text, default="")
    timeline_json = Column(Text, default="[]")     # JSON list of {time, event}
    recommendation = Column(Text, default="")
    evidence_event_id = Column(String, nullable=True)
    resolved = Column(Integer, default=0)          # 0 = open, 1 = resolved

    def to_dict(self) -> dict:
        try:
            timeline = json.loads(self.timeline_json)
        except Exception:
            timeline = []
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "camera_id": self.camera_id,
            "pattern": self.pattern,
            "confidence": self.confidence,
            "description": self.description,
            "timeline": timeline,
            "recommendation": self.recommendation,
            "evidence_event_id": self.evidence_event_id,
            "resolved": bool(self.resolved),
        }


# Create tables
Base.metadata.create_all(engine)


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------
def get_session() -> Session:
    return SessionLocal()


def store_event(
    detected_objects: str,
    person_count: int,
    object_summary: str,
    scene_description: str,
    risk_level: str,
    risk_score: float,
    ai_reasoning: str,
    suggested_action: str,
    snapshot_path: Optional[str] = None,
    snapshot_hash: Optional[str] = None,
    camera_id: str = "CAM-01",
) -> dict:
    """Persist a new security event and return it as a dict."""
    session = get_session()
    try:
        event = SecurityEvent(
            detected_objects=detected_objects,
            person_count=person_count,
            object_summary=object_summary,
            scene_description=scene_description,
            risk_level=risk_level,
            risk_score=risk_score,
            ai_reasoning=ai_reasoning,
            suggested_action=suggested_action,
            snapshot_path=snapshot_path,
            snapshot_hash=snapshot_hash,
            camera_id=camera_id,
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        return event.to_dict()
    finally:
        session.close()


def get_events(
    limit: int = 50,
    risk_level: Optional[str] = None,
    since: Optional[datetime] = None,
) -> list[dict]:
    """Retrieve events with optional filters, newest first."""
    session = get_session()
    try:
        q = session.query(SecurityEvent).order_by(desc(SecurityEvent.timestamp))
        if risk_level:
            q = q.filter(SecurityEvent.risk_level == risk_level.upper())
        if since:
            q = q.filter(SecurityEvent.timestamp >= since)
        return [e.to_dict() for e in q.limit(limit).all()]
    finally:
        session.close()


def get_event_by_id(event_id: str) -> Optional[dict]:
    session = get_session()
    try:
        event = session.query(SecurityEvent).filter_by(id=event_id).first()
        return event.to_dict() if event else None
    finally:
        session.close()


def get_today_events() -> list[dict]:
    """All events from today (UTC)."""
    today_start = datetime.now(ZoneInfo('Asia/Kolkata')).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return get_events(limit=500, since=today_start)


def get_event_stats() -> dict:
    """Summary statistics for today."""
    events = get_today_events()
    total = len(events)
    high = sum(1 for e in events if e["risk_level"] == "HIGH")
    medium = sum(1 for e in events if e["risk_level"] == "MEDIUM")
    low = sum(1 for e in events if e["risk_level"] == "LOW")
    return {
        "total_today": total,
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
        "events": events,
    }


# ---------------------------------------------------------------------------
# Incident CRUD
# ---------------------------------------------------------------------------
def store_incident(
    pattern: str,
    confidence: str,
    description: str,
    timeline: list,
    recommendation: str,
    evidence_event_id: Optional[str] = None,
    camera_id: str = "CAM-01",
) -> dict:
    """Persist a new AI-detected incident."""
    session = get_session()
    try:
        incident = Incident(
            pattern=pattern,
            confidence=confidence,
            description=description,
            timeline_json=json.dumps(timeline),
            recommendation=recommendation,
            evidence_event_id=evidence_event_id,
            camera_id=camera_id,
        )
        session.add(incident)
        session.commit()
        session.refresh(incident)
        return incident.to_dict()
    finally:
        session.close()


def get_incidents(limit: int = 20) -> list[dict]:
    """Retrieve recent incidents, newest first, including evidence snapshot if available."""
    session = get_session()
    try:
        q = session.query(Incident, SecurityEvent).outerjoin(
            SecurityEvent, Incident.evidence_event_id == SecurityEvent.id
        ).order_by(desc(Incident.timestamp)).limit(limit).all()
        
        results = []
        for inc, evt in q:
            d = inc.to_dict()
            d["snapshot_path"] = evt.snapshot_path if evt else None
            results.append(d)
        return results
    finally:
        session.close()


def get_open_incident_patterns() -> set:
    """Return patterns of incidents created in the last 30 minutes (to avoid duplicates)."""
    session = get_session()
    try:
        since = datetime.now(ZoneInfo('Asia/Kolkata')) - timedelta(minutes=30)
        rows = session.query(Incident).filter(Incident.timestamp >= since).all()
        return {r.pattern for r in rows}
    finally:
        session.close()

def get_insights() -> list[dict]:
    """Aggregate events by hour for the Predictive Risk Heatmap."""
    session = get_session()
    try:
        now = datetime.now(ZoneInfo('Asia/Kolkata'))
        since = now - timedelta(hours=24)
        events = session.query(SecurityEvent).filter(SecurityEvent.timestamp >= since).all()
        
        heatmap = {}
        for i in range(24):
            h = (now - timedelta(hours=i)).hour
            heatmap[h] = {"hour": h, "count": 0, "risk_sum": 0, "avg_risk": 0}
            
        for e in events:
            if not e.timestamp: continue
            h = e.timestamp.hour
            if h in heatmap:
                heatmap[h]["count"] += 1
                heatmap[h]["risk_sum"] += e.risk_score
                
        results = []
        for h in sorted(heatmap.keys()):
            data = heatmap[h]
            if data["count"] > 0:
                data["avg_risk"] = round(data["risk_sum"] / data["count"], 2)
            results.append({"hour": data["hour"], "count": data["count"], "avg_risk": data["avg_risk"]})
            
        return results
    finally:
        session.close()

