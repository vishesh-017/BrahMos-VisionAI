# BrahMos VisionAI Documentation

Welcome to the documentation directory for **BrahMos VisionAI**. This folder contains detailed, developer-centric documentation covering the system's underlying architecture, AI pipelines, and API references.

## Available Documentation

### 1. [System Architecture (`architecture.md`)](./architecture.md)
Comprehensive breakdown of the system design, including:
- High-level block diagrams and data flow.
- Details on the **Vision Engine** (YOLOv8 + OpenCV Haar Cascades).
- The **Memory & Vector DB** architecture for face recognition.
- The **Agentic AI Layer** (Google Gemini integration).
- The **React 18** "Command Center" frontend UI architecture.

### 2. [API Reference (`api_reference.md`)](./api_reference.md)
Detailed specs for the backend endpoints and communication protocols:
- **WebSocket Protocol**: `/ws/detections` for real-time live-feed and telemetry streaming.
- **REST APIs**: 
  - `/api/stream` (MJPEG camera feed)
  - `/api/events` (Historical threat log)
  - `/api/security-score` (Current threat metric calculation)
  - `/api/report` & `/api/report/pdf` (Forensic PDF generation endpoints)
  - `/api/chat` (Natural language interface)

---

### How to Contribute to Docs
If you are adding new features, APIs, or architectural components:
1. Please update the relevant markdown files in this directory.
2. Use GitHub Flavored Markdown (GFM).
3. If adding diagrams, prefer **Mermaid.js** syntax natively embedded in the markdown files for easy version control.
