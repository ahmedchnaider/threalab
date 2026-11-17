'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ToastContextType {
  toast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className={`fixed left-1/2 bottom-6 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-out ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
        }`}
      >
        <div className="bg-[#141414] text-[#f4f1ea] px-6 py-3 rounded-full font-medium text-sm shadow-2xl border border-[#333] max-w-[90vw] text-center">
          {message}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
