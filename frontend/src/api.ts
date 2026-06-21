const API_BASE = 'http://localhost:8000';

export const API = {
  stream: `${API_BASE}/api/stream`,
  status: `${API_BASE}/api/status`,
  analysis: `${API_BASE}/api/analysis`,
  events: `${API_BASE}/api/events`,
  stats: `${API_BASE}/api/stats`,
  chat: `${API_BASE}/api/chat`,
  report: `${API_BASE}/api/report`,
  reportPdf: `${API_BASE}/api/report/pdf`,
  snapshots: `${API_BASE}/snapshots`,
  ws: `ws://localhost:8000/ws/detections`,
  cameraStart: `${API_BASE}/api/camera/start`,
  cameraStop: `${API_BASE}/api/camera/stop`,
};

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
  identified_name?: string;
  identified_role?: string;
  in_zone?: boolean;
}

export interface AnalysisData {
  agent_mode?: 'gemini' | 'fallback';
  risk_level: RiskLevel;
  risk_score: number;
  reasons: string[];
  suggested_action: string;
  scene_description: string;
  detections: Detection[];
  person_count: number;
  objects: string[];
  fps: number;
  time: string;
  total_detections: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  camera_id: string;
  detected_objects: string;
  person_count: number;
  object_summary: string;
  scene_description: string;
  risk_level: RiskLevel;
  risk_score: number;
  ai_reasoning: string;
  suggested_action: string;
  snapshot_path: string | null;
  snapshot_hash: string | null;
}

export interface EventStats {
  total_today: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  events: SecurityEvent[];
}

export async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}
