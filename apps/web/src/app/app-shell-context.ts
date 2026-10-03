import { useOutletContext } from 'react-router-dom';
import type { CurrentUser } from '../access/current-user.types';

export interface AppShellContextValue {
  readonly user: CurrentUser;
}

export function useAppShell(): AppShellContextValue {
  return useOutletContext<AppShellContextValue>();
}
