import { useState, type ReactNode } from 'react';
import { ToastContext } from './toast-context';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  return (
    <ToastContext.Provider value={viewport}>
      {children}
      <div className="toast-viewport" ref={setViewport} aria-label="Notifications" />
    </ToastContext.Provider>
  );
}
