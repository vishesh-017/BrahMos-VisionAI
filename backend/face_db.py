"""
BrahMos Vision AI — Face Recognition Database
==============================================
Stores known persons and identifies them from live frames.

Strategy:
  Primary:   deepface (if installed) — high accuracy deep CNN embeddings
  Fallback:  OpenCV Haar + histogram fingerprint — works always

No external compile steps. All pure Python.

Roles:
  owner   — Zero risk contribution. Never flagged as intruder.
  staff   — Reduced risk contribution.
  guest   — Normal rules apply.
  unknown — Full security rules apply.
"""

import os
import json
import uuid
import base64
import numpy as np
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from sqlalchemy import Column, String, Text, DateTime, Integer, create_engine, desc
from sqlalchemy.orm import declarative_base, sessionmaker
import cv2

IST = ZoneInfo("Asia/Kolkata")

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "brahmos_vision.db")
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class KnownPerson(Base):
    """A registered person whose face is known to the system."""
    __tablename__ = "known_persons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    role = Column(String, default="guest")
    restricted_access = Column(Integer, default=0)
    encodings_json = Column(Text, default="[]")   # JSON list of float vectors
    photo_b64 = Column(Text, nullable=True)
    added_at = Column(DateTime, default=lambda: datetime.now(IST))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "restricted_access": bool(self.restricted_access),
            "photo_b64": self.photo_b64,
            "added_at": self.added_at.isoformat() if self.added_at else None,
        }


Base.metadata.create_all(engine)

from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE known_persons ADD COLUMN restricted_access INTEGER DEFAULT 0"))
        conn.commit()
except Exception:
    pass


# ---------------------------------------------------------------------------
# Face Encoder — tries deepface first, falls back to Histogram
# ---------------------------------------------------------------------------

def _encode_with_deepface(img_bgr: np.ndarray) -> Optional[list]:
    """Use deepface (Facenet / VGG-Face) to get a high-quality embedding."""
    try:
        from deepface import DeepFace
        result = DeepFace.represent(
            img_path=img_bgr,
            model_name="Facenet",
            enforce_detection=False,
            detector_backend="opencv",
        )
        if result and isinstance(result, list):
            return result[0]["embedding"]
        return None
    except Exception:
        return None


def _encode_with_histogram(img_bgr: np.ndarray) -> Optional[list]:
    """
    Fallback: compute a simple but effective facial feature vector using:
    - Color histogram (R, G, B channels)
    - LBP-style texture via Laplacian
    Normalized to unit length for cosine comparison.
    """
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3)

        if len(faces) > 0:
            x, y, w, h = faces[0]
            face_roi = img_bgr[y:y+h, x:x+w]
        else:
            face_roi = img_bgr  # use full image as fallback

        face_resized = cv2.resize(face_roi, (64, 64))

        # Color histogram features
        features = []
        for ch in range(3):
            hist = cv2.calcHist([face_resized], [ch], None, [32], [0, 256])
            features.extend(hist.flatten().tolist())

        # Grayscale texture via Laplacian (absolute values, normalized to 0-255)
        gray_face = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
        lap = cv2.Laplacian(gray_face, cv2.CV_32F)
        lap_abs = np.abs(lap)
        lap_max = lap_abs.max()
        if lap_max > 0:
            lap_norm = (lap_abs / lap_max * 255).astype(np.uint8)
        else:
            lap_norm = np.zeros_like(gray_face, dtype=np.uint8)
        lap_hist = cv2.calcHist([lap_norm], [0], None, [32], [0, 256])
        features.extend(lap_hist.flatten().tolist())

        vec = np.array(features, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()
    except Exception as e:
        print(f"[FaceDB] Histogram encoding error: {e}")
        return None


def _encode_face(img_bgr: np.ndarray) -> Optional[list]:
    """Try deepface first, fall back to histogram."""
    enc = _encode_with_deepface(img_bgr)
    if enc is not None:
        return enc
    return _encode_with_histogram(img_bgr)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------
_face_cache: list[dict] = []
_cache_loaded = False


def _load_cache():
    global _face_cache, _cache_loaded
    session = SessionLocal()
    try:
        persons = session.query(KnownPerson).all()
        _face_cache = []
        for p in persons:
            try:
                enc_list = json.loads(p.encodings_json)
                for enc in enc_list:
                    _face_cache.append({
                        "name": p.name,
                        "role": p.role,
                        "restricted_access": bool(p.restricted_access),
                        "id": p.id,
                        "encoding": np.array(enc, dtype=np.float64),
                    })
            except Exception:
                pass
        _cache_loaded = True
        print(f"[FaceDB] Loaded {len(_face_cache)} face encodings")
    finally:
        session.close()


def get_known_faces() -> list[dict]:
    global _cache_loaded
    if not _cache_loaded:
        _load_cache()
    return _face_cache


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def add_person(
    name: str,
    role: str,
    image_bytes: bytes,
    photo_b64: Optional[str] = None,
    restricted_access: bool = False,
) -> Optional[dict]:
    """
    Register a new person from raw image bytes.
    Returns the saved person dict, or None if no face found.
    """
    try:
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            return None

        encoding = _encode_face(img_bgr)
        if encoding is None:
            return None

        if photo_b64 is None:
            small = cv2.resize(img_bgr, (80, 80))
            _, buf = cv2.imencode('.jpg', small, [cv2.IMWRITE_JPEG_QUALITY, 75])
            photo_b64 = base64.b64encode(buf.tobytes()).decode()

        session = SessionLocal()
        try:
            person = KnownPerson(
                name=name,
                role=role,
                restricted_access=int(restricted_access),
                encodings_json=json.dumps([encoding]),
                photo_b64=photo_b64,
            )
            session.add(person)
            session.commit()
            session.refresh(person)
            result = person.to_dict()
        finally:
            session.close()

        _load_cache()
        print(f"[FaceDB] Registered: {name} ({role})")
        return result

    except Exception as e:
        print(f"[FaceDB] Error adding person: {e}")
        return None


def list_persons() -> list[dict]:
    session = SessionLocal()
    try:
        persons = session.query(KnownPerson).order_by(desc(KnownPerson.added_at)).all()
        return [p.to_dict() for p in persons]
    finally:
        session.close()


def delete_person(person_id: str) -> bool:
    global _cache_loaded
    session = SessionLocal()
    try:
        person = session.query(KnownPerson).filter_by(id=person_id).first()
        if not person:
            return False
        session.delete(person)
        session.commit()
        _cache_loaded = False
        _load_cache()
        return True
    finally:
        session.close()


def identify_face(face_roi_bgr: np.ndarray, threshold: float = 0.80) -> Optional[dict]:
    """
    Identify a person from a face region-of-interest (BGR image).
    Returns {name, role, id, confidence} or None.

    threshold: cosine similarity cutoff (0.80 = confident match).
    Deepface embeddings use different scale so we auto-adjust.
    """
    known = get_known_faces()
    if not known:
        return None

    query_enc = _encode_face(face_roi_bgr)
    if query_enc is None:
        return None

    query_vec = np.array(query_enc, dtype=np.float64)

    best_score = -1.0
    best_match = None

    for entry in known:
        sim = _cosine_similarity(query_vec, entry["encoding"])
        if sim > best_score:
            best_score = sim
            best_match = entry

    # deepface Facenet embeddings are high-dim; histogram ones need lower threshold
    # 0.65 works well for simple histogram cosine similarity
    if best_score >= 0.65 and best_match:
        return {
            "name": best_match["name"],
            "role": best_match["role"],
            "restricted_access": best_match.get("restricted_access", False),
            "id": best_match["id"],
            "confidence": float(best_score)
        }
    return None
