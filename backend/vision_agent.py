"""
BrahMos Vision AI — Agentic AI Reasoning Module
=================================================
This is the *brain* of the system.  It receives structured YOLO outputs
and performs:
  1. Rule-based risk assessment (always available)
  2. Gemini-powered scene narration and reasoning (when API key is set)

The agent operates on the Detect → Understand → Think → Decide → Act loop.
"""

import os
import json
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Try to import Gemini SDK
_gemini_available = False
genai = None
if GEMINI_API_KEY:
    try:
        import google.generativeai as _genai
        _genai.configure(api_key=GEMINI_API_KEY)
        genai = _genai
        _gemini_available = True
        print("[VisionAgent] Gemini API configured")
    except Exception as e:
        print(f"[VisionAgent] Gemini unavailable: {e}")


# ──────────────────────────────────────────────────────────────────────
# Security rules / heuristics
# ──────────────────────────────────────────────────────────────────────
RESTRICTED_OBJECTS = {"knife", "scissors", "gun", "rifle"}
UNATTENDED_OBJECTS = {"backpack", "suitcase", "handbag", "briefcase"}
VEHICLE_LABELS = {"car", "truck", "bus", "motorcycle", "bicycle"}
SAFETY_GEAR = {"helmet", "vest"}


def _compute_risk(summary: dict) -> dict:
    """
    Pure rule-based risk engine.

    Returns
    -------
    dict with keys: risk_level, risk_score, reasons, suggested_action, scene_description
    """
    persons = summary.get("person_count", 0)
    objects = summary.get("objects", [])
    period = summary.get("period", "day")
    all_labels = summary.get("all_labels", [])
    detections = summary.get("detections", [])

    # ── Owner Exemption ───────────────────────────────────────────
    # Count persons by role. Owners are fully exempted from risk.
    owner_count = sum(1 for d in detections if d.get("identified_role") == "owner")
    staff_count = sum(1 for d in detections if d.get("identified_role") == "staff")
    unknown_persons = persons - owner_count - staff_count
    # Only flag actual unknown persons (not owners/staff) in the rules
    effective_persons = max(0, unknown_persons)

    risk_score = 0.0
    reasons: list[str] = []
    actions: list[str] = []

    # ── Rule 0: Zone Violations ───────────────────────────────────────
    zone_violators = sum(1 for d in summary.get("detections", []) if d.get("in_zone", False) and d.get("identified_role") != "owner")
    if zone_violators > 0:
        risk_score += 0.6
        reasons.append(f"{zone_violators} person(s) breached a restricted zone")
        actions.append("Dispatch security to breached zone")

    # ── Rule 1: Restricted / dangerous objects ────────────────────
    dangerous = RESTRICTED_OBJECTS.intersection(set(objects))
    if dangerous:
        risk_score += 0.5
        reasons.append(f"Dangerous object(s) detected: {', '.join(dangerous)}")
        actions.append("Alert security immediately")

    # ── Rule 2: Unattended bag / object ───────────────────────────
    bags = UNATTENDED_OBJECTS.intersection(set(objects))
    if bags and persons == 0:
        risk_score += 0.4
        reasons.append(f"Unattended object(s) detected with no persons: {', '.join(bags)}")
        actions.append("Investigate unattended items")
    elif bags and persons >= 1:
        # Bag with person — slightly lower concern
        risk_score += 0.05

    # ── Rule 3: Large crowd (only unknown persons count) ─────────
    if effective_persons >= 8:
        risk_score += 0.35
        reasons.append(f"Large crowd detected ({effective_persons} unidentified persons)")
        actions.append("Monitor crowd behaviour")
    elif effective_persons >= 4:
        risk_score += 0.15
        reasons.append(f"Group of {effective_persons} unidentified persons detected")
        actions.append("Continue monitoring")
    elif owner_count > 0 and effective_persons == 0:
        reasons.append(f"Owner/staff present ({owner_count} recognised person(s)) — no risk")

    # ── Rule 4: Night-time activity ───────────────────────────────
    if period == "night" and effective_persons >= 1:
        risk_score += 0.2
        reasons.append("Unidentified activity detected during night-time hours")
        actions.append("Verify authorised access")

    # ── Rule 5: Vehicle in restricted area ────────────────────────
    vehicles = VEHICLE_LABELS.intersection(set(objects))
    if vehicles and persons == 0:
        risk_score += 0.15
        reasons.append(f"Unattended vehicle(s): {', '.join(vehicles)}")
        actions.append("Check for authorised parking")

    # ── Rule 6: No safety gear in work area ───────────────────────
    # (only triggers if people are present and no helmets/vests)
    if persons >= 1 and not SAFETY_GEAR.intersection(set(objects)):
        # Mild flag — could be normal; kept low
        risk_score += 0.02

    # ── Rule 7: Loitering ─────────────────────────────────────────
    loiterers = summary.get("loitering_count", 0)
    if loiterers > 0:
        risk_score += 0.35 * loiterers
        reasons.append(f"Suspicious loitering detected ({loiterers} persons)")
        actions.append("Dispatch guard or trigger voice warning")

    # ── Rule 8: Darkness & Masked Intruder ────────────────────────
    is_dark = summary.get("is_dark", False)
    unidentified_persons = summary.get("unidentified_persons", 0)
    
    if is_dark and unidentified_persons > 0:
        risk_score += 1.0  # Instant RED ALERT
        reasons.append(f"CRITICAL: {unidentified_persons} unidentified/masked person(s) detected in darkness")
        actions.append("TRIGGER LOCKDOWN IMMEDIATELY")

    # ── Clamp & categorise ────────────────────────────────────────
    risk_score = min(risk_score, 1.0)
    if risk_score >= 0.6:
        risk_level = "HIGH"
    elif risk_score >= 0.25:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    if not reasons:
        reasons.append("No significant threats detected")
    if not actions:
        actions.append("Continue routine monitoring")

    # ── Build scene description ───────────────────────────────────
    scene_parts: list[str] = []
    if persons == 0 and not objects:
        scene_parts.append("Scene is clear with no detections.")
    else:
        if persons == 1:
            scene_parts.append("One individual detected")
        elif persons > 1:
            scene_parts.append(f"{persons} individuals detected")
        if objects:
            scene_parts.append(f"with objects: {', '.join(objects)}")
        scene_parts.append(f"during {period} hours")

    scene_description = " ".join(scene_parts) + "."

    return {
        "risk_level": risk_level,
        "risk_score": round(risk_score, 2),
        "reasons": reasons,
        "suggested_action": "; ".join(actions),
        "scene_description": scene_description,
    }


# ──────────────────────────────────────────────────────────────────────
# Gemini-enhanced reasoning
# ──────────────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are BrahMos VisionAI, an autonomous AI security operator.
You receive structured detection data from a YOLO-based surveillance camera and
must produce a JSON analysis.

Respond ONLY with valid JSON containing these keys:
- scene_description: A concise 1-2 sentence narrative of what is happening.
- risk_level: One of LOW, MEDIUM, or HIGH.
- risk_score: A float from 0.0 to 1.0.
- reasons: An array of strings explaining the risk assessment.
- suggested_action: A single string with the recommended action.

Consider time of day, object combinations, crowd size, and potential threats.
Be professional and precise — you are a security system, not a chatbot."""


async def _gemini_analyse(summary: dict) -> Optional[dict]:
    """Call Gemini for enhanced reasoning. Returns None on failure."""
    if not _gemini_available or genai is None:
        return None
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = (
            f"Analyse this surveillance detection data and respond with JSON:\n"
            f"{json.dumps(summary, indent=2)}"
        )
        response = model.generate_content(
            [{"role": "user", "parts": [prompt]}],
            generation_config={"temperature": 0.3},
        )
        text = response.text.strip()
        # Strip markdown code fence if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        print(f"[VisionAgent] Gemini analysis failed: {e}")
        return None


# ──────────────────────────────────────────────────────────────────────
# Chat with memory
# ──────────────────────────────────────────────────────────────────────
async def chat_with_memory(question: str, events: list[dict]) -> str:
    """Answer user questions about security events using Gemini or fallback."""
    if _gemini_available and genai is not None:
        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            context = json.dumps(events[:30], indent=2, default=str)
            prompt = (
                f"You are BrahMos VisionAI, an AI security assistant. "
                f"The user is asking about security events.\n\n"
                f"Recent events data:\n{context}\n\n"
                f"User question: {question}\n\n"
                f"Provide a clear, professional answer."
            )
            response = model.generate_content(
                [{"role": "user", "parts": [prompt]}],
                generation_config={"temperature": 0.4},
            )
            return response.text.strip()
        except Exception as e:
            print(f"[VisionAgent] Chat Gemini error: {e}")

    # Fallback: simple summary
    return _fallback_chat(question, events)


def _fallback_chat(question: str, events: list[dict]) -> str:
    """Smart rule-based fallback that answers most questions without any API call."""
    total = len(events)
    q = question.lower().strip()

    if total == 0:
        return "No security events have been recorded yet today. The system is actively monitoring."

    high_events = [e for e in events if e.get("risk_level") == "HIGH"]
    medium_events = [e for e in events if e.get("risk_level") == "MEDIUM"]
    low_events = [e for e in events if e.get("risk_level") == "LOW"]

    # ── Security Score query ───────────────────────────────────────
    if any(w in q for w in ["score", "safety score", "rating", "grade"]):
        from scoring_engine import compute_score
        result = compute_score(events)
        lines = [
            f"**Campus Safety Score: {result['score']}/100 (Grade {result['grade']} — {result['status']})**",
            "",
            "**Issues Today:**",
        ]
        for issue in result["issues"]:
            lines.append(f"  - {issue}")
        lines.append("")
        lines.append("**Recommendations:**")
        for rec in result["recommendations"]:
            lines.append(f"  - {rec}")
        return "\n".join(lines)

    # ── Summary query ──────────────────────────────────────────────
    if any(w in q for w in ["summary", "summarize", "summarise", "today", "overview", "report"]):
        lines = [
            f"**Today's Security Summary**",
            f"Total events recorded: {total}",
            f"HIGH risk: {len(high_events)}",
            f"MEDIUM risk: {len(medium_events)}",
            f"LOW risk: {len(low_events)}",
        ]
        if high_events:
            last = high_events[0]
            lines.append(f"\nMost recent HIGH risk event:")
            lines.append(f"  {last.get('scene_description', 'N/A')}")
            lines.append(f"  Action: {last.get('suggested_action', 'N/A')}")
        return "\n".join(lines)

    # ── Suspicious / high risk query ───────────────────────────────
    if any(w in q for w in ["suspicious", "danger", "threat", "high risk", "alert", "incident"]):
        if not high_events and not medium_events:
            return "No suspicious events detected today. All activity appears normal."
        concerning = (high_events + medium_events)[:3]
        lines = [f"**{len(high_events + medium_events)} suspicious event(s) detected today:**", ""]
        for i, e in enumerate(concerning, 1):
            ts = e.get("timestamp", "")[:16].replace("T", " ")
            lines.append(f"{i}. [{ts}] {e.get('scene_description', 'N/A')}")
            lines.append(f"   Risk: {e.get('risk_level')} | Action: {e.get('suggested_action', 'N/A')}")
        return "\n".join(lines)

    # ── Person count / crowd query ──────────────────────────────────
    if any(w in q for w in ["how many people", "person count", "crowd", "persons", "humans"]):
        max_persons = max((e.get("person_count", 0) for e in events), default=0)
        avg_persons = sum(e.get("person_count", 0) for e in events) / max(total, 1)
        return (
            f"**Person Count Statistics:**\n"
            f"Peak count today: {max_persons} persons\n"
            f"Average count: {avg_persons:.1f} persons\n"
            f"Total monitoring sessions: {total}"
        )

    # ── Loitering query ────────────────────────────────────────────
    if any(w in q for w in ["loiter", "standing", "waiting", "stationary"]):
        loitering_events = [e for e in events if "loitering" in e.get("ai_reasoning", "").lower()]
        if not loitering_events:
            return "No loitering incidents detected today."
        return (
            f"**{len(loitering_events)} loitering incident(s) detected today.**\n\n"
            f"Most recent: {loitering_events[0].get('scene_description', 'N/A')}\n"
            f"Time: {loitering_events[0].get('timestamp', '')[:16].replace('T', ' ')}"
        )

    # ── Masked/intruder query ───────────────────────────────────────
    if any(w in q for w in ["masked", "intruder", "unidentified", "face", "dark", "night"]):
        night_events = [
            e for e in events
            if "unidentified" in e.get("ai_reasoning", "").lower()
            or "masked" in e.get("ai_reasoning", "").lower()
            or "night" in e.get("ai_reasoning", "").lower()
        ]
        if not night_events:
            return "No masked or unidentified person incidents recorded today."
        e = night_events[0]
        return (
            f"**{len(night_events)} night/masked intruder event(s) detected.**\n\n"
            f"Latest: {e.get('scene_description', 'N/A')}\n"
            f"Risk: {e.get('risk_level')} | Time: {e.get('timestamp', '')[:16].replace('T', ' ')}\n"
            f"Action taken: {e.get('suggested_action', 'N/A')}"
        )

    # ── Last event query ────────────────────────────────────────────
    if any(w in q for w in ["last", "latest", "recent", "just now", "current"]):
        latest = events[0]
        return (
            f"**Latest event ({latest.get('timestamp', '')[:16].replace('T', ' ')}):**\n"
            f"Scene: {latest.get('scene_description', 'N/A')}\n"
            f"Risk: {latest.get('risk_level')} ({latest.get('risk_score', 0):.0%})\n"
            f"Detected: {latest.get('object_summary', 'N/A')}\n"
            f"Recommended action: {latest.get('suggested_action', 'N/A')}"
        )

    # ── Default fallback ────────────────────────────────────────────
    return (
        f"I found {total} events today. {len(high_events)} high-risk and "
        f"{len(medium_events)} medium-risk. Ask me:\n"
        f"- 'Summarize today'\n"
        f"- 'Any suspicious activity?'\n"
        f"- 'What is the security score?'\n"
        f"- 'Any loitering today?'\n"
        f"- 'Show me the latest event'"
    )



# ──────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────
async def analyse_scene(summary: dict) -> dict:
    """
    Main entry point. Run the agentic reasoning pipeline:
      Detect → Understand → Think → Decide → Act

    Parameters
    ----------
    summary : dict  –  output of VisionEngine.summarise()

    Returns
    -------
    dict with risk_level, risk_score, reasons, suggested_action, scene_description
    """
    # Always compute rule-based first (fast, deterministic)
    rule_result = _compute_risk(summary)

    # Attempt Gemini enhancement
    gemini_result = await _gemini_analyse(summary)

    if gemini_result:
        # Merge: trust Gemini narrative but keep rule-based score as floor
        final_score = max(
            rule_result["risk_score"],
            gemini_result.get("risk_score", 0),
        )
        final_level = (
            "HIGH" if final_score >= 0.6
            else "MEDIUM" if final_score >= 0.25
            else "LOW"
        )
        return {
            "risk_level": final_level,
            "risk_score": round(final_score, 2),
            "reasons": gemini_result.get("reasons", rule_result["reasons"]),
            "suggested_action": gemini_result.get(
                "suggested_action", rule_result["suggested_action"]
            ),
            "scene_description": gemini_result.get(
                "scene_description", rule_result["scene_description"]
            ),
        }

    return rule_result
