import React, { useState, useEffect } from 'react';
import { ErrorLog, getLogs, clearLogs } from '../services/logService';

interface DebugLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DebugLogsModal: React.FC<DebugLogsModalProps> = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<ErrorLog[]>([]);

    useEffect(() => {
        if (isOpen) {
            setLogs(getLogs());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClear = () => {
        clearLogs();
        setLogs([]);
    }

    return (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/50 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h2 className="text-red-400 font-mono-sci font-bold flex items-center gap-2">
                        <span>⚠️</span> SYSTEM DIAGNOSTIC LOGS
                    </h2>
                    <div className="flex gap-4">
                        <button onClick={handleClear} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded">Clear Logs</button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">✕ Close</button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 font-mono-sci text-sm">
                            No error logs recorded.
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="bg-black/50 border border-slate-800 rounded p-4 font-mono text-xs">
                                <div className="text-slate-500 mb-2">{new Date(log.timestamp).toLocaleString()}</div>
                                <div className="text-red-400 font-bold mb-2 break-words">{log.message}</div>
                                {log.context && (
                                    <pre className="bg-slate-950 p-2 rounded text-slate-300 overflow-x-auto mt-2">
                                        {JSON.stringify(log.context, null, 2)}
                                    </pre>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DebugLogsModal;
