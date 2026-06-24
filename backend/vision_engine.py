"""
BrahMos Vision AI — YOLO Vision Engine
=======================================
Real-time webcam processing with YOLOv8n (nano) for CPU-friendly
object detection with bounding-box overlays, confidence scoring,
and automatic snapshot capture on notable events.
"""

import os
import time
import json
import threading
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional

import cv2
import numpy as np
from dotenv import load_dotenv

load_dotenv()

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.35"))
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
SNAPSHOTS_DIR = os.path.join(os.path.dirname(__file__), "data", "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

# ── Colour palette for bounding boxes (BGR) ──────────────────────────
COLOURS = [
    (0, 255, 136),   # green-cyan
    (255, 179, 0),   # amber
    (255, 0, 110),   # magenta
    (0, 200, 255),   # cyan
    (170, 120, 255), # lavender
    (255, 90, 90),   # coral
]


COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
    "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

class VisionEngine:
    """Wraps OpenCV DNN for real-time detection without any external dependencies."""

    def __init__(self):
        print("[VisionEngine] Loading ONNX model via OpenCV DNN …")
        self.model = cv2.dnn.readNetFromONNX("brahmos_vision_model.onnx")
        
        # Load Haar Cascade for Face Detection
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        self.cap: Optional[cv2.VideoCapture] = None
        self.running = False
        self.lock = threading.Lock()

        # Latest state (thread-safe reads via lock)
        self._latest_frame: Optional[np.ndarray] = None
        self._latest_annotated: Optional[np.ndarray] = None
        self._latest_detections: list[dict] = []
        self._fps: float = 0.0
        self._frame_count: int = 0
        self._is_dark: bool = False
        
        # Loitering tracker with behavior states:
        # { id: { "centroid": (cx, cy), "frames": int, "state": str, "prev_centroid": tuple } }
        self._trackers: dict[int, dict] = {}
        self._next_tracker_id = 0
        
        # Speed thresholds (pixels/frame)
        self.MOVING_THRESHOLD = 8
        self.RUNNING_THRESHOLD = 35
        
        self.restricted_zones = []

    # ─── Camera lifecycle ────────────────────────────────────────────
    def start_camera(self):
        if self.cap and self.cap.isOpened():
            return
        print(f"[VisionEngine] Opening camera index {CAMERA_INDEX}")
        self.cap = cv2.VideoCapture(CAMERA_INDEX)
        if not self.cap.isOpened():
            print("[VisionEngine] Could not open camera — using blank frames")
            self.cap = None
        else:
            # Optimise for speed and prevent lag
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.running = True

    def stop_camera(self):
        self.running = False
        if self.cap:
            self.cap.release()
            self.cap = None

    # ─── Main processing loop (called from a thread) ────────────────
    # --- Main processing loop (called from a thread) ----------------
    def process_frame(self) -> tuple[Optional[np.ndarray], list[dict]]:
        """Grab a frame, run YOLO, annotate, and return (annotated_frame, detections)."""

        if self.cap is None or not self.cap.isOpened():
            # Generate a placeholder frame
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(
                frame, "No Camera Feed - Waiting...", (100, 240),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 200), 2,
            )
        else:
            ret, frame = self.cap.read()
            if not ret:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(
                    frame, "Frame capture error", (150, 240),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2,
                )

        t0 = time.time()
        
        # Brightness / Darkness Detection
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray_frame)
        is_dark = bool(mean_brightness < 40.0)

        # Run inference (OpenCV DNN)
        blob = cv2.dnn.blobFromImage(frame, 1/255.0, (640, 640), swapRB=True, crop=False)
        self.model.setInput(blob)
        preds = self.model.forward()  # shape (1, 84, 8400)

        detections: list[dict] = []
        annotated = frame.copy()

        # Parse YOLOv8 ONNX output
        outputs = np.array([cv2.transpose(preds[0])])
        rows = outputs.shape[1]

        boxes = []
        scores = []
        class_ids = []

        x_factor = frame.shape[1] / 640
        y_factor = frame.shape[0] / 640

        for i in range(rows):
            classes_scores = outputs[0][i][4:]
            _, maxScore, _, maxClassIndex = cv2.minMaxLoc(classes_scores)
            if maxScore >= CONFIDENCE_THRESHOLD:
                x, y, w, h = outputs[0][i][0], outputs[0][i][1], outputs[0][i][2], outputs[0][i][3]
                left = int((x - w / 2) * x_factor)
                top = int((y - h / 2) * y_factor)
                width = int(w * x_factor)
                height = int(h * y_factor)
                class_ids.append(maxClassIndex[1])
                scores.append(maxScore)
                boxes.append([left, top, width, height])

        # Apply NMS
        indices = cv2.dnn.NMSBoxes(boxes, scores, CONFIDENCE_THRESHOLD, 0.45)

        current_centroids = []
        frame_height, frame_width = frame.shape[:2]
        
        # Draw restricted zones
        for zone in self.restricted_zones:
            if len(zone) > 2:
                pts = np.array([[int(nx * frame_width), int(ny * frame_height)] for nx, ny in zone], np.int32)
                pts = pts.reshape((-1, 1, 2))
                cv2.polylines(annotated, [pts], True, (0, 0, 255), 2)
                cv2.fillPoly(annotated, [pts], (0, 0, 255, 30))
        
        if len(indices) > 0:
            for i in indices.flatten():
                box = boxes[i]
                x1, y1 = box[0], box[1]
                x2, y2 = x1 + box[2], y1 + box[3]
                conf = scores[i]
                cls_id = class_ids[i]
                label = COCO_CLASSES[cls_id]
                colour = COLOURS[cls_id % len(COLOURS)]

                is_loitering = False
                
                # Loitering & Face Detection Logic (for people)
                if label == "person":
                    cx = (x1 + x2) // 2
                    cy = (y1 + y2) // 2
                    
                    # Ensure bbox is within frame boundaries
                    px1, py1 = max(0, x1), max(0, y1)
                    px2, py2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
                    
                    face_visible = False
                    identified_name = None
                    identified_role = None
                    
                    if px2 > px1 and py2 > py1:
                        person_roi_gray = gray_frame[py1:py2, px1:px2]
                        # Assume face visible if we have a person box
                        face_visible = True
                    
                    # Check restricted zones
                    in_zone = False
                    for zone in self.restricted_zones:
                        if len(zone) > 2:
                            pts = np.array([[int(nx * frame_width), int(ny * frame_height)] for nx, ny in zone], np.int32)
                            if cv2.pointPolygonTest(pts, (cx, cy), False) >= 0:
                                in_zone = True
                                break

                    current_centroids.append((cx, cy, x1, y1, x2, y2, conf, label, colour, face_visible, identified_name, identified_role, in_zone))
                else:
                    detections.append({
                        "label": label,
                        "confidence": round(conf, 2),
                        "bbox": [x1, y1, x2, y2],
                        "loitering": False,
                        "face_visible": True
                    })
                    # Draw normal bounding box
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), colour, 2)
                    txt = f"{label} {conf:.0%}"
                    (tw, th), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 6, y1), colour, -1)
                    cv2.putText(annotated, txt, (x1 + 3, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        # Update trackers for people
        unmatched_trackers = set(self._trackers.keys())
        new_trackers = {}
        
        for (cx, cy, x1, y1, x2, y2, conf, label, colour, face_visible, identified_name, identified_role, in_zone) in current_centroids:
            matched_id = None
            min_dist = float('inf')
            
            for tid, tdata in self._trackers.items():
                if tid in unmatched_trackers:
                    dist = np.sqrt((cx - tdata["centroid"][0])**2 + (cy - tdata["centroid"][1])**2)
                    if dist < 150 and dist < min_dist:
                        min_dist = dist
                        matched_id = tid
                        
            if matched_id is not None:
                unmatched_trackers.remove(matched_id)
                self._trackers[matched_id]["centroid"] = (cx, cy)
                self._trackers[matched_id]["frames"] += 1
                self._trackers[matched_id]["unseen"] = 0
                tid_to_use = matched_id
                
                # Inherit identity from tracker if known
                if self._trackers[matched_id].get("identified_name"):
                    identified_name = self._trackers[matched_id]["identified_name"]
                    identified_role = self._trackers[matched_id]["identified_role"]
                    
            else:
                tid_to_use = self._next_tracker_id
                self._trackers[tid_to_use] = {"centroid": (cx, cy), "frames": 1, "unseen": 0}
                self._next_tracker_id += 1
                
            # Run Face Recognition ONLY if unidentified and it's been present for a few frames
            if not identified_name and face_visible and self._trackers[tid_to_use]["frames"] % 15 == 0:
                try:
                    import face_db
                    # Get person ROI
                    px1, py1 = max(0, x1), max(0, y1)
                    px2, py2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
                    if px2 > px1 and py2 > py1:
                        person_roi_bgr = frame[py1:py2, px1:px2]
                        match = face_db.identify_face(person_roi_bgr)
                        if match:
                            identified_name = match["name"]
                            identified_role = match["role"]
                            self._trackers[tid_to_use]["identified_name"] = identified_name
                            self._trackers[tid_to_use]["identified_role"] = identified_role
                except Exception:
                    pass

            new_trackers[tid_to_use] = self._trackers[tid_to_use]
            
            frames_present = self._trackers[tid_to_use]["frames"]
            # Behavior state logic
            prev_centroid = self._trackers[tid_to_use].get("prev_centroid")
            if prev_centroid:
                dx = cx - prev_centroid[0]
                dy = cy - prev_centroid[1]
                speed = np.sqrt(dx**2 + dy**2)
            else:
                speed = 0
            
            if frames_present <= 5:
                behavior = "ENTERING"
            elif speed >= self.RUNNING_THRESHOLD:
                behavior = "RUNNING"
            elif speed >= self.MOVING_THRESHOLD:
                behavior = "MOVING"
            elif frames_present > 150:
                behavior = "LOITERING"
            else:
                behavior = "WAITING"
                
            self._trackers[tid_to_use]["prev_centroid"] = (cx, cy)
            
            # Flag as loitering if present for more than 150 frames (~10 seconds at 15 FPS)
            is_loitering = frames_present > 150
            
            # Owners are NEVER flagged as loitering
            if identified_role == "owner":
                is_loitering = False
            
            detections.append({
                "label": label,
                "confidence": round(conf, 2),
                "bbox": [x1, y1, x2, y2],
                "loitering": is_loitering,
                "face_visible": face_visible,
                "behavior": behavior,
                "tracker_id": tid_to_use,
                "identified_name": identified_name,
                "identified_role": identified_role,
                "in_zone": in_zone,
            })
            
            # Draw bounding box — green for known persons, amber for owner, red for loitering, default otherwise
            if identified_role == "owner":
                box_colour = (0, 215, 255)  # gold
            elif identified_name:
                box_colour = (0, 255, 100)  # bright green
            elif is_loitering:
                box_colour = (0, 0, 255)    # red
            else:
                box_colour = colour
            cv2.rectangle(annotated, (x1, y1), (x2, y2), box_colour, 2)
            
            # Label: show name if identified, else generic
            if identified_name:
                role_tag = f" [{identified_role.upper()}]" if identified_role else ""
                txt = f"{identified_name}{role_tag}"
            else:
                status_txt = " (LOITERING)" if is_loitering else ""
                txt = f"{label} {conf:.0%}{status_txt}"
            
            (tw, th), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 6, y1), box_colour, -1)
            cv2.putText(
                annotated, txt, (x1 + 3, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1,
            )

        # Keep unseen trackers alive for 30 frames (2 seconds)
        for tid in unmatched_trackers:
            tdata = self._trackers[tid]
            tdata["unseen"] = tdata.get("unseen", 0) + 1
            if tdata["unseen"] <= 30:
                new_trackers[tid] = tdata

        self._trackers = new_trackers

        elapsed = time.time() - t0
        fps = 1.0 / elapsed if elapsed > 0 else 0

        # HUD overlay
        ts_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(
            annotated, f"BrahMos VisionAI | FPS: {fps:.1f}", (10, 25),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 200), 1,
        )
        cv2.putText(
            annotated, ts_str, (10, 470),
            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1,
        )

        # Update shared state
        with self.lock:
            self._latest_frame = frame
            self._latest_annotated = annotated
            self._latest_detections = detections
            self._fps = fps
            self._frame_count += 1
            self._is_dark = is_dark

        return annotated, detections

    # ─── Accessors ───────────────────────────────────────────────────
    @property
    def latest_detections(self) -> list[dict]:
        with self.lock:
            return list(self._latest_detections)

    @property
    def fps(self) -> float:
        with self.lock:
            return self._fps

    @property
    def frame_count(self) -> int:
        with self.lock:
            return self._frame_count

    def get_annotated_jpeg(self, quality: int = 70) -> Optional[bytes]:
        """Return the latest annotated frame as JPEG bytes."""
        with self.lock:
            frame = self._latest_annotated
        if frame is None:
            return None
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        return buf.tobytes()

    # ─── Snapshot ────────────────────────────────────────────────────
    def capture_snapshot(self) -> Optional[str]:
        """Save the current raw frame as a snapshot and return the filename."""
        with self.lock:
            frame = self._latest_frame
        if frame is None:
            return None
        fname = f"snapshot_{datetime.now(ZoneInfo('Asia/Kolkata')).strftime('%Y%m%d_%H%M%S_%f')}.jpg"
        path = os.path.join(SNAPSHOTS_DIR, fname)
        cv2.imwrite(path, frame)
        return fname

    def clear_trackers_identity(self):
        """Force re-identification of all tracked persons (e.g. after database updates)."""
        for tid in self._trackers:
            if "identified_name" in self._trackers[tid]:
                del self._trackers[tid]["identified_name"]
            if "identified_role" in self._trackers[tid]:
                del self._trackers[tid]["identified_role"]

    # ─── Summarise detections ────────────────────────────────────────
    def summarise(self) -> dict:
        """Return a structured summary of the latest detections."""
        with self.lock:
            dets = list(self._latest_detections)
            is_dark = self._is_dark
        labels = [d["label"] for d in dets]
        persons = labels.count("person")
        objects = [l for l in labels if l != "person"]
        unique_objects = list(set(objects))
        loitering_count = sum(1 for d in dets if d.get("loitering"))
        unidentified_persons = sum(1 for d in dets if d.get("label") == "person" and not d.get("face_visible", True))
        
        return {
            "person_count": persons,
            "loitering_count": loitering_count,
            "unidentified_persons": unidentified_persons,
            "objects": unique_objects,
            "all_labels": labels,
            "total_detections": len(dets),
            "detections": dets,
            "fps": round(self.fps, 1),
            "is_dark": is_dark,
            "time": datetime.now().strftime("%H:%M:%S"),
            "period": _time_period(),
        }


def _time_period() -> str:
    """Return human-readable time period."""
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 21:
        return "evening"
    else:
        return "night"
