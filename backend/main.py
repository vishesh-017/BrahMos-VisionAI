"""
BrahMos Vision AI — FastAPI Backend
=====================================
Main server handling:
  • MJPEG video stream with YOLO overlays
  • WebSocket for real-time detection data
  • REST APIs for events, chat, reports, and system status
"""

import asyncio
import io
import json
import os
import time
import threading
import smtplib
import queue
import pyttsx3
import winsound
import hashlib
import requests
from email.message import EmailMessage
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from vision_engine import VisionEngine
from vision_agent import analyse_scene, chat_with_memory, _gemini_available
import memory
import incident_engine
import scoring_engine
import face_db

# ──────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
ANALYSIS_INTERVAL = 3          # seconds between AI analyses
MEMORY_SAVE_INTERVAL = 15      # seconds between memory saves (non-LOW events)
ALWAYS_SAVE_INTERVAL = 60      # seconds between memory saves (even LOW events)
INCIDENT_CHECK_INTERVAL = 30   # seconds between incident investigation runs

# ──────────────────────────────────────────────────────────────────────
# Globals
# ──────────────────────────────────────────────────────────────────────
engine = VisionEngine()
_latest_analysis: dict = {}
_analysis_lock = threading.Lock()
_ws_clients: list[WebSocket] = []
_stop_event = threading.Event()
_restricted_zones: list[list[list[int]]] = []  # list of polygons [[x,y],...]

# Queues for background jobs
_voice_queue = queue.Queue()
_email_queue = queue.Queue()
_telegram_queue = queue.Queue()

# ──────────────────────────────────────────────────────────────────────
# Background threads
# ──────────────────────────────────────────────────────────────────────
def _voice_loop():
    """Consumes warning messages and speaks them using pyttsx3."""
    engine = pyttsx3.init()
    engine.setProperty('rate', 150)
    while not _stop_event.is_set():
        try:
            msg = _voice_queue.get(timeout=1.0)
            print(f"[Voice Dispatcher] Playing Siren and Speaking: '{msg}'")
            # Play a blaring European-style siren (alternating frequencies)
            for _ in range(4):
                winsound.Beep(900, 400)
                winsound.Beep(700, 400)
                
            engine.say(msg)
            engine.runAndWait()
            _voice_queue.task_done()
        except queue.Empty:
            continue
        except Exception as e:
            print(f"[Voice Dispatcher] Error: {e}")

def _email_loop():
    """Consumes email requests and sends them via SMTP."""
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    recipient = os.getenv("ALERT_RECIPIENT_EMAIL")
    
    while not _stop_event.is_set():
        try:
            payload = _email_queue.get(timeout=1.0)
            subject = payload.get("subject", "Security Alert")
            body = payload.get("body", "")
            
            if not smtp_email or not smtp_password or not recipient:
                print(f"[Email Dispatcher] SIMULATED DISPATCH (No credentials) -> TO: Admin | SUB: {subject}")
            else:
                msg = EmailMessage()
                msg.set_content(body)
                msg['Subject'] = subject
                msg['From'] = smtp_email
                msg['To'] = recipient
                try:
                    server = smtplib.SMTP('smtp.gmail.com', 587)
                    server.starttls()
                    server.login(smtp_email, smtp_password)
                    server.send_message(msg)
                    server.quit()
                    print(f"[Email Dispatcher] ✉️ Successfully sent alert to {recipient}")
                except Exception as e:
                    print(f"[Email Dispatcher] Failed to send email: {e}")
            _email_queue.task_done()
        except queue.Empty:
            continue
        except Exception as e:
            print(f"[Email Dispatcher] Error: {e}")

def _telegram_loop():
    """Consumes telegram requests and sends them to the Telegram Bot API."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    while not _stop_event.is_set():
        try:
            payload = _telegram_queue.get(timeout=1.0)
            text = payload.get("text", "")
            
            if not bot_token or not chat_id:
                print(f"[Telegram Dispatcher] SIMULATED DISPATCH (No credentials) -> SUB: {text[:50]}...")
            else:
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                try:
                    resp = requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})
                    if resp.status_code == 200:
                        print("[Telegram Dispatcher] 📱 Successfully sent alert to Telegram")
                    else:
                        print(f"[Telegram Dispatcher] Failed: {resp.text}")
                except Exception as e:
                    print(f"[Telegram Dispatcher] Request failed: {e}")
            _telegram_queue.task_done()
        except queue.Empty:
            continue
        except Exception as e:
            print(f"[Telegram Dispatcher] Error: {e}")

def _vision_loop():
    """Continuously grab frames and run YOLO (runs in a daemon thread)."""
    while not _stop_event.is_set():
        try:
            engine.process_frame()
        except Exception as e:
            print(f"[VisionLoop] Error: {e}")
        # Limit to ~15 FPS to keep CPU manageable
        time.sleep(0.066)
    engine.stop_camera()


def _analysis_loop():
    """Periodically analyse the scene and optionally store to memory."""
    global _latest_analysis
    
    last_save = 0
    last_always_save = 0
    last_saved_state = None
    last_saved_state_time = 0.0

    while not _stop_event.is_set():
        time.sleep(ANALYSIS_INTERVAL)
        try:
            summary = engine.summarise()
            if summary["total_detections"] == 0 and not _latest_analysis:
                continue

            # Run the agentic reasoning
            loop = asyncio.new_event_loop()
            analysis = loop.run_until_complete(analyse_scene(summary))
            loop.close()

            analysis["detections"] = summary["detections"]
            analysis["person_count"] = summary["person_count"]
            analysis["objects"] = summary["objects"]
            analysis["fps"] = summary["fps"]
            analysis["time"] = summary["time"]
            analysis["total_detections"] = summary["total_detections"]
            analysis["agent_mode"] = "gemini" if _gemini_available else "fallback"

            with _analysis_lock:
                _latest_analysis = analysis

            # Save noteworthy events to memory
            now = time.time()
            should_save = False
            if analysis["risk_level"] in ("HIGH", "MEDIUM"):
                if now - last_save >= MEMORY_SAVE_INTERVAL:
                    should_save = True
                    last_save = now
            elif now - last_always_save >= ALWAYS_SAVE_INTERVAL:
                should_save = True
                last_always_save = now

            if should_save and summary["total_detections"] > 0:
                current_state = (analysis["risk_level"], summary["person_count"], tuple(sorted(summary["objects"])))
                
                # Prevent spam: only save if state changed, or if 5 minutes have passed
                if current_state == last_saved_state and (now - last_saved_state_time) < 300:
                    should_save = False
                
                if should_save:
                    last_saved_state = current_state
                    last_saved_state_time = now
                    
                    snapshot = engine.capture_snapshot()
                    snapshot_hash = None
                    if snapshot:
                        # Compute SHA-256 hash for tamper-evident record
                        try:
                            snapshot_path = os.path.join(os.path.dirname(__file__), "data", "snapshots", snapshot)
                            with open(snapshot_path, "rb") as f:
                                snapshot_bytes = f.read()
                                snapshot_hash = hashlib.sha256(snapshot_bytes).hexdigest()
                        except Exception as e:
                            print(f"[Core] Error hashing snapshot: {e}")

                    memory.store_event(
                        detected_objects=json.dumps(summary["all_labels"]),
                        person_count=summary["person_count"],
                        object_summary=", ".join(summary["objects"]) if summary["objects"] else "none",
                        scene_description=analysis.get("scene_description", ""),
                        risk_level=analysis["risk_level"],
                        risk_score=analysis["risk_score"],
                        ai_reasoning="; ".join(analysis.get("reasons", [])),
                        suggested_action=analysis.get("suggested_action", ""),
                        snapshot_path=snapshot,
                        snapshot_hash=snapshot_hash,
                    )
                
                # TRIGGER HACKATHON FEATURES
                if analysis["risk_level"] == "HIGH":
                    # Trigger Voice Warning
                    warn_msg = f"Attention. {analysis.get('scene_description', 'High risk detected')} Please evacuate or authorize immediately."
                    _voice_queue.put(warn_msg)
                    
                    # Trigger Email Dispatch
                    email_body = f"""BrahMos VisionAI Security Alert
                    
Risk Level: HIGH (Score: {analysis['risk_score']})
Time: {summary['time']}
Persons Detected: {summary['person_count']}
Loitering Detected: {summary.get('loitering_count', 0)}

AI Reasoning:
{"; ".join(analysis.get("reasons", []))}

Suggested Action:
{analysis.get("suggested_action", "")}

Scene Description:
{analysis.get("scene_description", "")}
"""
                    _email_queue.put({
                        "subject": f"URGENT: High Security Risk Detected at {summary['time']}",
                        "body": email_body
                    })
                    
                    # Trigger Telegram Dispatch
                    tg_text = f"🚨 *BrahMos VisionAI Alert* 🚨\n\n*Risk Level:* HIGH (Score: {analysis['risk_score']})\n*Time:* {summary['time']}\n*Persons:* {summary['person_count']}\n\n*Reasoning:*\n{'; '.join(analysis.get('reasons', []))}\n\n*Action:* {analysis.get('suggested_action', '')}"
                    _telegram_queue.put({"text": tg_text})
                    
        except Exception as e:
            print(f"[AnalysisLoop] Error: {e}")


def _incident_loop():
    """Runs the AI Incident Investigator every 30 seconds."""
    while not _stop_event.is_set():
        time.sleep(INCIDENT_CHECK_INTERVAL)
        try:
            # Get recent events from last 2 hours for pattern detection
            from datetime import timedelta
            since = datetime.now(ZoneInfo('Asia/Kolkata')) - timedelta(hours=2)
            recent_events = memory.get_events(limit=100, since=since)
            
            if not recent_events:
                continue
                
            # Run investigator
            incidents = incident_engine.investigate(recent_events)
            
            # Deduplicate: don't store the same pattern twice in 30 minutes
            existing_patterns = memory.get_open_incident_patterns()
            
            for inc in incidents:
                if inc["pattern"] not in existing_patterns:
                    memory.store_incident(
                        pattern=inc["pattern"],
                        confidence=inc["confidence"],
                        description=inc["description"],
                        timeline=inc["timeline"],
                        recommendation=inc["recommendation"],
                        evidence_event_id=inc.get("evidence_event_id"),
                    )
                    print(f"[IncidentEngine] New incident: {inc['pattern']} ({inc['confidence']})")
        except Exception as e:
            print(f"[IncidentLoop] Error: {e}")
# ──────────────────────────────────────────────────────────────────────
# App lifecycle
# ──────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background threads on startup, stop on shutdown."""
    _stop_event.clear()
    t1 = threading.Thread(target=_vision_loop, daemon=True)
    t2 = threading.Thread(target=_analysis_loop, daemon=True)
    t3 = threading.Thread(target=_voice_loop, daemon=True)
    t4 = threading.Thread(target=_email_loop, daemon=True)
    t5 = threading.Thread(target=_incident_loop, daemon=True)
    t6 = threading.Thread(target=_telegram_loop, daemon=True)
    t1.start(); t2.start(); t3.start(); t4.start(); t5.start(); t6.start()
    print("[BrahMos VisionAI] System online — All agents active")
    yield
    _stop_event.set()
    t1.join(timeout=3); t2.join(timeout=3)
    t3.join(timeout=1); t4.join(timeout=1); t5.join(timeout=1); t6.join(timeout=1)
    print("[BrahMos VisionAI] System shutting down")


app = FastAPI(
    title="BrahMos VisionAI",
    description="Agentic AI Vision Surveillance System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve snapshots
SNAPSHOTS_DIR = os.path.join(os.path.dirname(__file__), "data", "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
app.mount("/snapshots", StaticFiles(directory=SNAPSHOTS_DIR), name="snapshots")


# ──────────────────────────────────────────────────────────────────────
# MJPEG Video Stream
# ──────────────────────────────────────────────────────────────────────
async def _mjpeg_generator():
    """Yield MJPEG frames for the video stream."""
    while True:
        jpeg = engine.get_annotated_jpeg(quality=65)
        if jpeg:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
            )
        await asyncio.sleep(0.066)   # ~15 FPS


@app.get("/api/stream")
async def video_stream():
    """Live MJPEG stream with YOLO overlays."""
    return StreamingResponse(
        _mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ──────────────────────────────────────────────────────────────────────
# WebSocket — real-time detection data
# ──────────────────────────────────────────────────────────────────────
@app.websocket("/ws/detections")
async def ws_detections(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.append(websocket)
    try:
        while True:
            with _analysis_lock:
                data = dict(_latest_analysis)
            if data:
                await websocket.send_json(data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)


# ──────────────────────────────────────────────────────────────────────
# REST APIs
# ──────────────────────────────────────────────────────────────────────
@app.get("/api/status")
async def system_status():
    with _analysis_lock:
        analysis = dict(_latest_analysis)
    stats = memory.get_event_stats()
    return {
        "system": "BrahMos VisionAI",
        "status": "online",
        "camera": "active" if engine.cap and engine.cap.isOpened() else "simulated",
        "fps": engine.fps,
        "frame_count": engine.frame_count,
        "agent_mode": "gemini" if _gemini_available else "rule-based",
        "current_analysis": analysis,
        "today_stats": {
            "total": stats["total_today"],
            "high": stats["high_risk"],
            "medium": stats["medium_risk"],
            "low": stats["low_risk"],
        },
    }


@app.get("/api/analysis")
async def current_analysis():
    with _analysis_lock:
        return dict(_latest_analysis) or {"message": "No analysis yet"}


@app.get("/api/events")
async def list_events(
    limit: int = Query(50, ge=1, le=500),
    risk: str = Query(None),
):
    return memory.get_events(limit=limit, risk_level=risk)


@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    event = memory.get_event_by_id(event_id)
    if not event:
        return JSONResponse({"error": "Event not found"}, status_code=404)
    return event


@app.get("/api/stats")
async def event_stats():
    return memory.get_event_stats()


@app.post("/api/chat")
async def ai_chat(body: dict):
    question = body.get("question", "")
    if not question:
        return {"error": "No question provided"}
    events = memory.get_today_events()
    answer = await chat_with_memory(question, events)
    return {"question": question, "answer": answer}


@app.post("/api/report")
async def generate_report():
    """Generate a JSON security report (frontend renders to PDF)."""
    stats = memory.get_event_stats()
    events = stats["events"]

    high_events = [e for e in events if e["risk_level"] == "HIGH"]
    medium_events = [e for e in events if e["risk_level"] == "MEDIUM"]

    report = {
        "title": "BrahMos VisionAI — Security Report",
        "generated_at": datetime.now(ZoneInfo('Asia/Kolkata')).isoformat(),
        "summary": {
            "total_events": stats["total_today"],
            "high_risk": stats["high_risk"],
            "medium_risk": stats["medium_risk"],
            "low_risk": stats["low_risk"],
        },
        "high_risk_events": high_events[:20],
        "medium_risk_events": medium_events[:20],
        "observations": [],
        "recommendations": [],
    }

    # Auto-generate observations
    if stats["high_risk"] > 0:
        report["observations"].append(
            f"{stats['high_risk']} high-risk event(s) detected today requiring immediate attention."
        )
    if stats["medium_risk"] > 5:
        report["observations"].append(
            f"Elevated medium-risk activity ({stats['medium_risk']} events) — consider increased patrol."
        )
    if stats["total_today"] == 0:
        report["observations"].append("No events recorded today. System may need calibration check.")

    # Recommendations
    if stats["high_risk"] > 0:
        report["recommendations"].append("Review all HIGH risk events and verify security response.")
    report["recommendations"].append("Ensure all camera feeds are operational.")
    report["recommendations"].append("Update detection model if false positive rate is high.")

    return report


@app.get("/api/report/pdf")
async def generate_report_pdf():
    """Generate a real PDF using reportlab and stream it to the browser with proper filename headers."""
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    stats = memory.get_event_stats()
    events = stats["events"]
    high_events = [e for e in events if e["risk_level"] == "HIGH"]
    medium_events = [e for e in events if e["risk_level"] == "MEDIUM"]

    # Build observations & recommendations
    observations = []
    recommendations = []
    if stats["high_risk"] > 0:
        observations.append(f"{stats['high_risk']} high-risk event(s) detected today requiring immediate attention.")
    if stats["medium_risk"] > 5:
        observations.append(f"Elevated medium-risk activity ({stats['medium_risk']} events) — consider increased patrol.")
    if stats["total_today"] == 0:
        observations.append("No events recorded today. System may need calibration check.")
    if stats["high_risk"] > 0:
        recommendations.append("Review all HIGH risk events and verify security response.")
    recommendations.append("Ensure all camera feeds are operational.")
    recommendations.append("Update detection model if false positive rate is high.")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm,
        title="BrahMos VisionAI — Security Report",
    )

    styles = getSampleStyleSheet()
    CYAN   = colors.HexColor("#0ea5e9")
    DARK   = colors.HexColor("#0f172a")
    MUTED  = colors.HexColor("#64748b")
    RED    = colors.HexColor("#dc2626")
    AMBER  = colors.HexColor("#d97706")
    GREEN  = colors.HexColor("#16a34a")
    LIGHT  = colors.HexColor("#f8fafc")

    h1  = ParagraphStyle("h1",  parent=styles["Heading1"],  fontSize=18, textColor=DARK,  spaceAfter=2)
    sub = ParagraphStyle("sub", parent=styles["Normal"],     fontSize=9,  textColor=MUTED, spaceAfter=0)
    h2  = ParagraphStyle("h2",  parent=styles["Heading2"],  fontSize=12, textColor=DARK,  spaceAfter=4, spaceBefore=10)
    h3r = ParagraphStyle("h3r", parent=styles["Heading3"],  fontSize=11, textColor=RED,   spaceAfter=4, spaceBefore=8)
    h3a = ParagraphStyle("h3a", parent=styles["Heading3"],  fontSize=11, textColor=AMBER, spaceAfter=4, spaceBefore=8)
    bod = ParagraphStyle("bod", parent=styles["Normal"],     fontSize=9,  textColor=DARK,  spaceAfter=2, leading=13)
    sml = ParagraphStyle("sml", parent=styles["Normal"],     fontSize=8,  textColor=MUTED, spaceAfter=1)

    story = []

    # ── Header ──────────────────────────────────────────────────────
    story.append(Paragraph("BrahMos VisionAI — Security Report", h1))
    story.append(Paragraph("Agentic AI Surveillance System", sub))
    story.append(Spacer(1, 4))
    now_str = datetime.now(ZoneInfo('Asia/Kolkata')).strftime("%d/%m/%Y %H:%M:%S IST")
    story.append(Paragraph(f"Generated: {now_str}  |  CONFIDENTIAL", sml))
    story.append(HRFlowable(width="100%", thickness=2, color=CYAN, spaceAfter=12))

    # ── Executive Summary ───────────────────────────────────────────
    story.append(Paragraph("Executive Summary", h2))
    summary_data = [
        ["TOTAL EVENTS", "HIGH RISK", "MEDIUM RISK", "LOW RISK"],
        [
            str(stats["total_today"]),
            str(stats["high_risk"]),
            str(stats["medium_risk"]),
            str(stats["low_risk"]),
        ],
    ]
    summary_table = Table(summary_data, colWidths=[40*mm, 40*mm, 40*mm, 40*mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0),  colors.HexColor("#e2e8f0")),
        ("BACKGROUND",   (1,1), (1,1),   colors.HexColor("#fef2f2")),
        ("BACKGROUND",   (2,1), (2,1),   colors.HexColor("#fffbeb")),
        ("BACKGROUND",   (3,1), (3,1),   colors.HexColor("#f0fdf4")),
        ("TEXTCOLOR",    (0,0), (-1,0),  DARK),
        ("TEXTCOLOR",    (1,1), (1,1),   RED),
        ("TEXTCOLOR",    (2,1), (2,1),   AMBER),
        ("TEXTCOLOR",    (3,1), (3,1),   GREEN),
        ("FONTSIZE",     (0,0), (-1,0),  8),
        ("FONTSIZE",     (0,1), (-1,1),  22),
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica-Bold"),
        ("ALIGN",        (0,0), (-1,-1), "CENTER"),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.HexColor("#e2e8f0"), LIGHT]),
        ("BOX",          (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ("INNERGRID",    (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING",   (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0), (-1,-1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # Observations & Recommendations side-by-side
    if observations or recommendations:
        obs_text = "<b>Key Observations:</b><br/>" + "<br/>".join(f"• {o}" for o in observations) if observations else "<b>Key Observations:</b><br/>No critical observations."
        rec_text = "<b>Recommendations:</b><br/>" + "<br/>".join(f"• {r}" for r in recommendations) if recommendations else ""
        obs_para = Paragraph(obs_text, bod)
        rec_para = Paragraph(rec_text, bod) if rec_text else Paragraph("", bod)
        or_table = Table([[obs_para, rec_para]], colWidths=[83*mm, 83*mm])
        or_table.setStyle(TableStyle([
            ("BACKGROUND",  (0,0), (0,0), colors.HexColor("#fffbeb")),
            ("BACKGROUND",  (1,0), (1,0), colors.HexColor("#f0fdf4")),
            ("BOX",         (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ("INNERGRID",   (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING",  (0,0), (-1,-1), 8),
            ("BOTTOMPADDING",(0,0), (-1,-1), 8),
            ("LEFTPADDING", (0,0), (-1,-1), 10),
            ("RIGHTPADDING",(0,0), (-1,-1), 10),
            ("VALIGN",      (0,0), (-1,-1), "TOP"),
        ]))
        story.append(or_table)
        story.append(Spacer(1, 12))

    # ── High Risk Events ────────────────────────────────────────────
    if high_events:
        story.append(HRFlowable(width="100%", thickness=1, color=RED, spaceAfter=6))
        story.append(Paragraph(f"⚠  Critical Evidence Log — {len(high_events)} High Risk Event(s)", h3r))
        for ev in high_events[:20]:
            ts = datetime.fromisoformat(ev["timestamp"]).strftime("%d/%m/%Y %H:%M:%S")
            score = ev.get("risk_score", "N/A")
            desc = ev.get("scene_description", "N/A")
            reasoning = ev.get("ai_reasoning", "N/A")
            persons = ev.get("person_count", 0)
            objects = ev.get("object_summary", "none")

            ev_data = [
                [Paragraph(f"<b>Time:</b> {ts}", sml), Paragraph(f"<b>Risk Score:</b> <font color='#dc2626'>{score}</font>", sml)],
                [Paragraph(f"<b>Description:</b> {desc}", bod), ""],
                [Paragraph(f"<b>AI Reasoning:</b> {reasoning}", bod), ""],
                [Paragraph(f"<b>Persons:</b> {persons}  |  <b>Objects:</b> {objects}", sml), ""],
            ]

            # Append image if snapshot exists
            snapshot_file = ev.get("snapshot_path")
            if snapshot_file:
                snap_full = os.path.join(os.path.dirname(__file__), "data", "snapshots", snapshot_file)
                if os.path.exists(snap_full):
                    from reportlab.platypus import Image as RLImage
                    try:
                        # 16:9 ratio image, fit width to 100mm
                        img = RLImage(snap_full, width=100*mm, height=56.25*mm)
                        ev_data.append([img, ""])
                    except Exception as e:
                        print(f"Failed to load image for PDF: {e}")

            ev_table = Table(ev_data, colWidths=[110*mm, 56*mm], repeatRows=0)
            
            table_styles = [
                ("BACKGROUND",   (0,0), (-1,-1), colors.HexColor("#fef2f2")),
                ("BOX",          (0,0), (-1,-1), 1, RED),
                ("SPAN",         (0,1), (1,1)),
                ("SPAN",         (0,2), (1,2)),
                ("SPAN",         (0,3), (1,3)),
                ("TOPPADDING",   (0,0), (-1,-1), 5),
                ("BOTTOMPADDING",(0,0), (-1,-1), 5),
                ("LEFTPADDING",  (0,0), (-1,-1), 8),
                ("RIGHTPADDING", (0,0), (-1,-1), 8),
                ("VALIGN",       (0,0), (-1,-1), "TOP"),
            ]
            
            if snapshot_file and len(ev_data) > 4:
                table_styles.append(("SPAN", (0,4), (1,4)))
                table_styles.append(("ALIGN", (0,4), (1,4), "CENTER"))
                table_styles.append(("BOTTOMPADDING", (0,4), (1,4), 10))

            ev_table.setStyle(TableStyle(table_styles))
            story.append(ev_table)
            story.append(Spacer(1, 6))

    # ── Medium Risk Events ──────────────────────────────────────────
    if medium_events:
        story.append(HRFlowable(width="100%", thickness=1, color=AMBER, spaceAfter=6))
        story.append(Paragraph(f"Medium Risk Events — {len(medium_events)} Event(s)", h3a))
        med_data = [["Time", "Description", "Score"]]
        for ev in medium_events[:20]:
            ts = datetime.fromisoformat(ev["timestamp"]).strftime("%H:%M:%S")
            med_data.append([ts, ev.get("scene_description", "N/A"), str(ev.get("risk_score", "N/A"))])
        med_table = Table(med_data, colWidths=[28*mm, 120*mm, 18*mm])
        med_table.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0),  colors.HexColor("#fffbeb")),
            ("TEXTCOLOR",     (0,0), (-1,0),  AMBER),
            ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,-1), 8),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, colors.HexColor("#fffbeb")]),
            ("BOX",           (0,0), (-1,-1), 0.5, AMBER),
            ("INNERGRID",     (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ]))
        story.append(med_table)
        story.append(Spacer(1, 12))

    # ── Footer ──────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=MUTED, spaceAfter=4))
    story.append(Paragraph("BrahMos VisionAI v1.0 — Detect • Understand • Think • Decide • Act  |  CONFIDENTIAL", sml))

    doc.build(story)
    buf.seek(0)

    date_str = datetime.now().strftime("%Y-%m-%d")
    filename = f"BrahMos_Forensic_Report_{date_str}.pdf"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(buf, media_type="application/pdf", headers=headers)


@app.post("/api/camera/start")
async def start_camera():
    engine.start_camera()
    return {"camera": "active"}

@app.post("/api/camera/stop")
async def stop_camera():
    engine.stop_camera()
    return {"camera": "stopped"}


# ──────────────────────────────────────────────────────────────────────
# New Hackathon Feature Endpoints
# ──────────────────────────────────────────────────────────────────────
@app.get("/api/incidents")
async def get_incidents(limit: int = Query(20, ge=1, le=100)):
    """Get AI-investigated incident reports."""
    return memory.get_incidents(limit=limit)

@app.get("/api/insights")
async def get_insights():
    """Get aggregated event data by hour for risk heatmap."""
    return memory.get_insights()


@app.get("/api/security-score")
async def get_security_score():
    """Get today's Campus Safety Score."""
    events = memory.get_today_events()
    return scoring_engine.compute_score(events)


@app.post("/api/zones")
async def set_zones(body: dict):
    """Set restricted zone polygons. body = {"zones": [[[x,y], [x,y], ...], ...]}"""
    zones = body.get("zones", [])
    engine.restricted_zones = zones
    return {"zones_set": len(zones)}


@app.get("/api/zones")
async def get_zones():
    """Get current restricted zone polygons."""
    return {"zones": engine.restricted_zones}


# ──────────────────────────────────────────────────────────────────────
# Person Registry (Face Recognition)
# ──────────────────────────────────────────────────────────────────────
@app.get("/api/persons")
async def list_persons():
    """List all registered persons."""
    return face_db.list_persons()


@app.post("/api/persons")
async def register_person(
    name: str = Form(...),
    role: str = Form("guest"),
    photo: UploadFile = File(...),
):
    """Register a new person with a photo upload."""
    image_bytes = await photo.read()
    result = face_db.add_person(name=name, role=role, image_bytes=image_bytes)
    if result is None:
        return JSONResponse(
            {"error": "No face detected in the uploaded photo. Please use a clear, front-facing photo."},
            status_code=400,
        )
    return result


@app.delete("/api/persons/{person_id}")
async def delete_person(person_id: str):
    """Remove a person from the registry."""
    success = face_db.delete_person(person_id)
    if not success:
        return JSONResponse({"error": "Person not found"}, status_code=404)
    return {"deleted": person_id}


# ──────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False)
