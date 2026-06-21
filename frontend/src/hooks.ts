import { useState, useEffect, useRef, useCallback } from 'react';
import { API, fetchJSON } from './api';
import type { AnalysisData, SecurityEvent, EventStats } from './api';

/** Hook: WebSocket connection for real-time detection data */
export function useDetections() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<any>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(API.ws);
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.risk_level) setAnalysis(data);
        } catch { /* ignore bad messages */ }
      };
      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    } catch {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { analysis, connected };
}

/** Hook: Polling for event statistics */
export function useStats(intervalMs = 5000) {
  const [stats, setStats] = useState<EventStats | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await fetchJSON<EventStats>(API.stats);
        if (active) setStats(data);
      } catch { /* server may not be up yet */ }
    };
    poll();
    const id = setInterval(poll, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [intervalMs]);

  return stats;
}

/** Hook: Fetch recent events */
export function useEvents(limit = 30, refreshKey = 0) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchJSON<SecurityEvent[]>(`${API.events}?limit=${limit}`);
        if (active) setEvents(data);
      } catch { /* ignore */ }
      if (active) setLoading(false);
    };
    load();
    const id = setInterval(load, 8000);
    return () => { active = false; clearInterval(id); };
  }, [limit, refreshKey]);

  return { events, loading };
}
