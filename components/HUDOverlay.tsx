
import React, { useState, useEffect } from 'react';

const HUDOverlay: React.FC = () => {
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [binaryStream, setBinaryStream] = useState<string>('');
  const [cpuLoad, setCpuLoad] = useState<number[]>(new Array(10).fill(0));
  const [logs, setLogs] = useState<string[]>([]);

  // Random Data Generator
  useEffect(() => {
    const interval = setInterval(() => {
      // Update Coordinates
      setCoords({
        x: Math.floor(Math.random() * 9999),
        y: Math.floor(Math.random() * 9999),
        z: Math.floor(Math.random() * 999)
      });

      // Update CPU Load Bars
      setCpuLoad(prev => prev.map(() => Math.floor(Math.random() * 100)));

      // Generate Binary Stream
      let bin = '';
      for (let i = 0; i < 8; i++) bin += Math.random() > 0.5 ? '1' : '0';
      setBinaryStream(bin);

    }, 150); // Fast update

    return () => clearInterval(interval);
  }, []);

  // System Log Generator
  useEffect(() => {
    const messages = [
      "SCANNING_VECTOR_DB...",
      "CALIBRATING_LENS...",
      "BIO_SIGNATURE_DETECTED",
      "UPLINK_ESTABLISHED",
      "ANALYZING_PATHOGEN...",
      "PURGING_CACHE...",
      "THERMAL_NORMAL",
      "PACKET_RECEIVED",
      "ENCRYPTING_DATA...",
      "SEARCHING_HOST..."
    ];

    const interval = setInterval(() => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      setLogs(prev => [`[${timestamp}] ${randomMsg}`, ...prev].slice(0, 4));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto mt-8 max-w-[280px] font-mono-sci pointer-events-none select-none z-0 opacity-80 hover:opacity-100 transition-opacity">
        <div className="bg-slate-950/60 backdrop-blur-sm border-l-2 border-emerald-500 p-4 rounded-r-lg shadow-[0_0_20px_rgba(16,185,129,0.1)] overflow-hidden group">
          
          {/* Decorative Scan Line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/50 animate-[scan-line_3s_linear_infinite]"></div>

          {/* Header */}
          <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
              <span className="text-xs text-emerald-400 font-bold tracking-widest">SYS_MONITOR</span>
              <span className="text-[10px] text-red-500 animate-pulse">● LIVE</span>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-slate-400">
             <div>
                <span className="text-slate-600">LAT:</span> {coords.x}.{coords.z} N
             </div>
             <div>
                <span className="text-slate-600">LON:</span> {coords.y}.{coords.z} E
             </div>
             <div>
                 <span className="text-slate-600">ALT:</span> {coords.z} M
             </div>
             <div>
                 <span className="text-slate-600">BIN:</span> <span className="text-emerald-600">{binaryStream}</span>
             </div>
          </div>

          {/* Visualizer Bars */}
          <div className="flex items-end gap-[2px] h-10 mb-3 opacity-80">
             {cpuLoad.map((val, idx) => (
               <div 
                 key={idx} 
                 className={`flex-1 transition-all duration-150 ${val > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                 style={{ height: `${val}%` }}
               ></div>
             ))}
          </div>

          {/* Rolling Logs */}
          <div className="space-y-1 overflow-hidden h-[60px] mask-image-linear-gradient">
             {logs.map((log, i) => (
               <div key={i} className={`text-[10px] truncate ${i === 0 ? 'text-white' : 'text-slate-500'}`}>
                  {i === 0 ? '>' : ' '} {log}
               </div>
             ))}
          </div>

          {/* Decorative Footer */}
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500"></div>
        </div>
    </div>
  );
};

export default HUDOverlay;
