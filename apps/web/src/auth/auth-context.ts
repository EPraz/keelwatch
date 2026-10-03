import { createContext, useContext } from 'react';
import type { AuthSession } from './auth.types';

export const AuthSessionContext = createContext<AuthSession | null>(null);

export function useAuthSession(): AuthSession {
  const session = useContext(AuthSessionContext);
  if (!session) throw new Error('useAuthSession must be used inside AuthRoot.');
  return session;
}
