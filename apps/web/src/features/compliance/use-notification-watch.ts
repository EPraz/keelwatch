import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import {
  ComplianceApiError,
  enqueueNotificationJob,
  getNotificationJob,
  getNotificationWatch,
} from './compliance.api';
import type {
  ComplianceApiErrorBody,
  NotificationJobRun,
  NotificationWatch,
} from './compliance.types';

type WatchState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly watch: NotificationWatch }
  | { readonly status: 'error'; readonly error: ComplianceApiErrorBody };

function networkError(): ComplianceApiErrorBody {
  return {
    code: 'NETWORK_ERROR',
    message: 'The notification watch could not be reached. Try again.',
  };
}

export function useNotificationWatch() {
  const session = useAuthSession();
  const [state, setState] = useState<WatchState>({ status: 'loading' });
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<NotificationJobRun | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading' });
    try {
      const token = await session.getAccessToken();
      if (!token) throw new ComplianceApiError(401, networkError());
      setState({
        status: 'success',
        watch: await getNotificationWatch(token, controller.signal),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState({
        status: 'error',
        error: error instanceof ComplianceApiError ? error.body : networkError(),
      });
    }
  }, [session]);

  useEffect(() => {
    void load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const runJob = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
    setLastRun(null);
    try {
      const token = await session.getAccessToken();
      if (!token) throw new ComplianceApiError(401, networkError());
      const queued = await enqueueNotificationJob(token, controller.signal);
      let run = queued;
      for (
        let attempt = 0;
        attempt < 30 && !['SUCCEEDED', 'FAILED'].includes(run.status);
        attempt += 1
      ) {
        run = await getNotificationJob(token, run.id, controller.signal);
        if (!['SUCCEEDED', 'FAILED'].includes(run.status)) {
          await new Promise((resolveWait) => setTimeout(resolveWait, 250));
        }
      }
      if (!['SUCCEEDED', 'FAILED'].includes(run.status)) {
        throw new ComplianceApiError(undefined, {
          code: 'NOTIFICATION_JOB_TIMEOUT',
          message: 'The expiry check is still running. Retry the watch in a moment.',
        });
      }
      setLastRun(run);
      setState({
        status: 'success',
        watch: await getNotificationWatch(token, controller.signal),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState({
        status: 'error',
        error: error instanceof ComplianceApiError ? error.body : networkError(),
      });
    } finally {
      setRunning(false);
    }
  }, [session]);

  return { state, running, lastRun, retry: load, runJob };
}
