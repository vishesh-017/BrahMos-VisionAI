# 🏗️ BrahMos VisionAI Architecture

This document outlines the core architecture and data flow of the BrahMos VisionAI platform.

## System Overview Diagram

```mermaid
graph TD
    %% Define styles
    classDef hardware fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef backend fill:#0f172a,stroke:#8b5cf6,stroke-width:2px,color:#fff
    classDef frontend fill:#171717,stroke:#10b981,stroke-width:2px,color:#fff
    classDef ai fill:#312e81,stroke:#a855f7,stroke-width:2px,color:#fff

    subgraph Video Source
        C[CCTV / Web Camera]:::hardware
    end

    subgraph Backend Core [Python FastAPI]
        VE[Vision Engine <br> OpenCV]:::backend
        Y[YOLOv8 <br> Object Detection]:::ai
        AE[Analysis Loop <br> Gemini/LLM Reasoning]:::ai
        IE[Incident Engine <br> Pattern Detection]:::ai
        MEM[(SQLite Memory)]:::backend
        
        VE -->|Frame| Y
        Y -->|Detections| VE
        VE -->|Scene Summary| AE
        AE -->|Risk & Insight| MEM
        MEM -->|Recent Events| IE
        IE -->|Incidents| MEM
    end

    subgraph Output & Alerts [Dispatchers]
        VD[Voice Warning]:::backend
        EM[Email Dispatcher]:::backend
        TG[Telegram Bot]:::backend
        
        AE -->|High Risk| VD
        AE -->|High Risk| EM
        AE -->|High Risk| TG
    end

    subgraph Frontend [React Dashboard]
        V_STREAM[Live MJPEG Stream]:::frontend
        WS[WebSocket Client]:::frontend
        UI[Dashboard UI]:::frontend
        
        VE -->|/api/stream| V_STREAM
        AE -->|/ws/detections| WS
        WS --> UI
        V_STREAM --> UI
    end

    C -->|RTSP/USB| VE
```

---

## Component Breakdown

### 1. Vision Engine (`vision_engine.py`)
Responsible for connecting to the camera, reading frames via OpenCV, and running the `brahmos_vision_model.onnx` (YOLO) model for raw object detection. It runs in a dedicated background thread (`_vision_loop`).

### 2. Analysis Engine (`main.py` -> `_analysis_loop`)
Runs periodically (e.g., every 3 seconds). It takes the raw detections (e.g., "3 Persons", "1 Car") and runs **Agentic AI Reasoning** using local LLMs or Gemini Vision. This layer assigns a dynamic **Risk Score (LOW, MEDIUM, HIGH)** based on the scene context.

### 3. Incident Engine (`incident_engine.py`)
Runs every 30 seconds. It looks at the recent history in the database (Memory) and detects larger patterns. For example, if it sees "Medium Risk: Person loitering" 5 times in the last hour, it creates a new "Suspicious Pattern Incident".

### 4. Dispatchers (`main.py`)
Background daemon threads that wait in queues to send alerts:
- **Voice Loop:** Plays an audible siren and speaks the warning via TTS.
- **Email Loop:** Sends urgent email reports via SMTP.
- **Telegram Loop:** Sends push notifications to a Telegram chat.

### 5. WebSocket Server
Pushes the real-time AI reasoning and bounding box coordinates to the React frontend at ~30 FPS, keeping the dashboard live without constant HTTP polling.
