import React, { useState, useEffect } from 'react';

export type ToastType = 'error' | 'success' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'error', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styleMap = {
    error: 'bg-red-900/90 border-red-500 text-red-200',
    success: 'bg-emerald-900/90 border-emerald-500 text-emerald-200',
    warning: 'bg-amber-900/90 border-amber-500 text-amber-200'
  };

  const iconMap = {
    error: '🚨',
    success: '✅',
    warning: '⚠️'
  };

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-up border px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-md ${styleMap[type]}`}>
      <span className="text-xl">{iconMap[type]}</span>
      <p className="font-mono-sci text-sm tracking-wide">{message}</p>
      <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
};
