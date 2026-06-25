import React, { useState, useEffect } from 'react';
import { Camera as CameraIcon, Plus, Trash2, X, PlaySquare, Video } from 'lucide-react';
import { API } from '../api';
import type { Camera } from '../api';

interface CameraSidebarProps {
  onClose: () => void;
}

export const CameraSidebar: React.FC<CameraSidebarProps> = ({ onClose }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamUrl, setNewCamUrl] = useState('');

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const res = await fetch(API.cameras);
      const data = await res.json();
      setCameras(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCamera = async () => {
    if (!newCamName) return;
    const newCamera: Camera = {
      id: `cam-${Date.now()}`,
      name: newCamName,
      url: newCamUrl
    };
    const updated = [...cameras, newCamera];
    setCameras(updated);
    setIsAdding(false);
    setNewCamName('');
    setNewCamUrl('');
    
    await fetch(API.cameras, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  const handleDelete = async (id: string) => {
    const updated = cameras.filter(c => c.id !== id);
    setCameras(updated);
    await fetch(API.cameras, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  const handleSwitchCamera = async (cam: Camera) => {
    setActiveCameraId(cam.id);
    await fetch(API.cameraSwitch, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cam.url })
    });
  };

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-slate-900/95 border-r border-slate-700/50 shadow-2xl z-50 backdrop-blur-md flex flex-col transform transition-transform">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-white tracking-wide">Camera Manager</h2>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {cameras.map(cam => (
          <div 
            key={cam.id}
            className={`p-3 rounded-lg border transition-all ${activeCameraId === cam.id ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <CameraIcon className={`w-4 h-4 ${activeCameraId === cam.id ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="font-medium text-sm text-white">{cam.name}</span>
              </div>
              <button onClick={() => handleDelete(cam.id)} className="text-slate-500 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs text-slate-500 truncate mb-3">{cam.url || 'Local Web Camera'}</div>
            <button 
              onClick={() => handleSwitchCamera(cam)}
              disabled={activeCameraId === cam.id}
              className={`w-full py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeCameraId === cam.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
            >
              {activeCameraId === cam.id ? 'Live' : <><PlaySquare className="w-3.5 h-3.5" /> Switch to Camera</>}
            </button>
          </div>
        ))}

        {isAdding ? (
          <div className="p-3 bg-slate-800 rounded-lg border border-slate-600 space-y-3">
            <input 
              type="text" 
              placeholder="Camera Name (e.g. Front Gate)" 
              value={newCamName}
              onChange={e => setNewCamName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <input 
              type="text" 
              placeholder="RTSP URL (Optional)" 
              value={newCamUrl}
              onChange={e => setNewCamUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <div className="flex gap-2">
              <button onClick={handleAddCamera} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-1.5 rounded">Save</button>
              <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium py-1.5 rounded">Cancel</button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full py-2 border border-dashed border-slate-600 hover:border-emerald-500 rounded-lg flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New Camera
          </button>
        )}
      </div>
    </div>
  );
};
