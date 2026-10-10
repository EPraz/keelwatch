import { createContext } from 'react';

export const ToastContext = createContext<HTMLDivElement | null | undefined>(undefined);
