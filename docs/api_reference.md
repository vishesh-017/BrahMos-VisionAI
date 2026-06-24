# 🔌 API Reference

The BrahMos VisionAI backend is built on **FastAPI**. It runs by default on `http://localhost:8000`. 
Below is a reference to the main HTTP and WebSocket endpoints used by the dashboard.

---

## 🟢 Live Streaming Endpoints

### 1. MJPEG Video Stream
**`GET /api/stream`**
Returns a continuous MJPEG video stream with YOLO bounding boxes drawn directly onto the frames.
- **Content-Type**: `multipart/x-mixed-replace; boundary=frame`
- **Usage**: Typically used directly in an HTML `<img>` tag on the frontend.

### 2. Live Detection WebSocket
**`WS /ws/detections`**
A WebSocket connection that streams the latest AI analysis, bounding boxes, and risk scores in real-time.
- **Message Format (JSON)**:
  ```json
  {
    "time": "14:35:12",
    "fps": 15.2,
    "total_detections": 3,
    "person_count": 2,
    "objects": ["person", "person", "car"],
    "risk_level": "LOW",
    "risk_score": 10,
    "scene_description": "Normal activity observed.",
    "agent_mode": "gemini"
  }
  ```

---

## 📊 Status & Analytics

### 3. System Status
**`GET /api/status`**
Returns the current status of the backend, connected camera, and today's statistics.

### 4. Current Analysis
**`GET /api/analysis`**
Returns the single most recent frame analysis (same payload as the WebSocket, but via REST).

### 5. Event Statistics
**`GET /api/stats`**
Returns aggregated statistics for the current day (total events, high risk, medium risk, low risk).

---

## 🛡️ Event Memory & Search

### 6. List Historical Events
**`GET /api/events?limit={int}&risk={string}`**
Fetches a list of logged security events.
- **Query Params**:
  - `limit` (default 50)
  - `risk` (optional): Filter by "HIGH", "MEDIUM", or "LOW"

### 7. Get Specific Event
**`GET /api/events/{event_id}`**
Retrieves details of a single event, including its reasoning and snapshot hash.

---

## 🤖 AI Interaction & Reporting

### 8. AI Security Chat
**`POST /api/chat`**
Ask the AI natural language questions about today's events.
- **Request Body**:
  ```json
  {
    "question": "Did anyone enter the server room?"
  }
  ```
- **Response**:
  ```json
  {
    "question": "Did anyone enter the server room?",
    "answer": "Yes, two people were detected near the restricted server area at 14:32. Risk was marked as HIGH."
  }
  ```

### 9. Generate Security Report
**`POST /api/report`**
Compiles all events and statistics into a structured JSON report. The React frontend consumes this to generate a downloadable PDF.
