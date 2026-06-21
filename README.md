# BrahMos VisionAI 🦅🛡️

**Agentic AI Surveillance System** — *Detect • Understand • Think • Decide • Act*

BrahMos VisionAI is an advanced, real-time AI security and surveillance dashboard. Powered by local ONNX models for object detection and local LLMs (or Gemini) for high-level reasoning, the system not only detects what is in the camera feed, but actively *understands context, assigns risk scores, and recommends actions*.

![BrahMos VisionAI Dashboard](frontend/public/favicon.ico) <!-- Replace with a screenshot URL when available -->

---

## 🌟 Key Features

*   **Real-time Object Detection:** Uses YOLOv8 (ONNX) to identify persons, vehicles, bags, and potential threats with high accuracy and low latency.
*   **Agentic AI Reasoning:** Goes beyond standard bounding boxes. The system analyzes the *context* of the scene. (e.g., "Person walking a dog" vs. "Unidentified person loitering near restricted server room at 3 AM").
*   **Dynamic Risk Scoring:** Automatically assigns a Risk Level (LOW, MEDIUM, HIGH) to events based on AI analysis.
*   **Forensic Report Generation:** Instantly generate beautiful, detailed PDF security reports summarizing daily events, statistics, and critical warnings.
*   **Smart Query System:** Ask the system questions in natural language like *"Did anyone enter the restricted zone today?"* or *"Summarize today's high-risk events."*
*   **Edge-Ready Architecture:** Designed to run entirely locally using Python, OpenCV, ONNXRuntime, and modern web technologies.

---

## 🏗️ Architecture

The system is split into a robust Python backend and a highly responsive React frontend.

*   **Backend:** Python 3, FastAPI, OpenCV, ONNXRuntime, SQLite (Memory), ReportLab (PDF Generation).
*   **Frontend:** React (Vite), TypeScript, Framer Motion (Animations), Lucide React (Icons).
*   **Communication:** WebSockets for 30fps real-time inference data + REST APIs for historical events and reports.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
*   Python 3.10+
*   Node.js 18+
*   npm or yarn

### 2. Setup the Backend
Navigate to the backend directory and install the requirements:
```bash
cd backend
pip install -r requirements.txt
```

**Export the AI Model:**
The system uses YOLOv8 for detection. Run the export script to download and convert the model to ONNX format:
```bash
python export_onnx.py
```
*(This prevents pushing heavy AI weights directly to the repository).*

**Start the Server:**
```bash
python main.py
```
The backend will run on `http://localhost:8000`.

### 3. Setup the Frontend
Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:5173` (or the port Vite provides).

---

## ⚖️ License & Acknowledgements

This project is open-source and licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See the `AGPL-LICENSE.txt` file for full details.


---
*Built for the future of intelligent physical security.*
