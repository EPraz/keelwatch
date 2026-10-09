import { useEffect, useRef, useState } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import type { MaintenanceOrder, MaintenanceTransitionInput } from './maintenance.types';
import {
  MaintenanceApiError,
  maintenancePath,
  readMaintenance,
  transitionMaintenance,
} from './maintenance.api';
import {
  lifecycleActions,
  lifecycleReasons,
  type MaintenanceAction,
} from './maintenance-lifecycle-options';

export function useMaintenanceLifecycle(
  vesselId: string,
  initial: MaintenanceOrder,
  onSaved: (order: MaintenanceOrder) => void,
) {
  const session = useAuthSession();
  const [baseline, setBaseline] = useState(initial);
  const [action, setAction] = useState<MaintenanceAction | ''>(
    lifecycleActions[initial.status][0] ?? '',
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<MaintenanceApiError>();
  const [pending, setPending] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [latest, setLatest] = useState<MaintenanceOrder>();
  const [reviewError, setReviewError] = useState<MaintenanceApiError>();
  const [reviewLoading, setReviewLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
      setPending(false);
      setReviewLoading(false);
    },
    [session, vesselId],
  );
  const path = `${maintenancePath(vesselId)}/${encodeURIComponent(initial.id)}`;
  const failure = (value: unknown) =>
    value instanceof MaintenanceApiError
      ? value
      : new MaintenanceApiError(
          0,
          'WRITE_UNCONFIRMED',
          'The action could not be confirmed. Check current values before another attempt.',
        );
  async function loadCurrent(controller: AbortController) {
    setLatest(undefined);
    setReviewError(undefined);
    setReviewLoading(true);
    try {
      const token = await session.getAccessToken();
      if (controller.signal.aborted) return;
      if (!token)
        throw new MaintenanceApiError(401, 'SESSION_ENDED', 'Sign in again to continue.');
      const current = await readMaintenance<MaintenanceOrder>(
        token,
        path,
        controller.signal,
      );
      if (!controller.signal.aborted) setLatest(current);
    } catch (value) {
      if (!controller.signal.aborted) setReviewError(failure(value));
    } finally {
      if (!controller.signal.aborted) setReviewLoading(false);
    }
  }
  async function review() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    await loadCurrent(controller);
    if (!controller.signal.aborted) request.current = null;
  }
  async function save() {
    if (
      request.current ||
      needsReview ||
      !action ||
      !lifecycleActions[baseline.status].includes(action) ||
      (error && [401, 403, 404].includes(error.status))
    )
      return;
    const reasons: readonly string[] =
      action === 'BLOCK' || action === 'CANCEL' ? lifecycleReasons[action] : [];
    if (reasons.length && !reasons.includes(reason)) {
      setError(
        new MaintenanceApiError(
          400,
          'MAINTENANCE_REASON_INVALID',
          'Choose a reason before continuing.',
          undefined,
          { reasonCode: ['Choose a reason before continuing.'] },
        ),
      );
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(undefined);
    try {
      const token = await session.getAccessToken();
      if (controller.signal.aborted) return;
      if (!token)
        throw new MaintenanceApiError(401, 'SESSION_ENDED', 'Sign in again to continue.');
      const saved = await transitionMaintenance(
        token,
        path,
        {
          action,
          expectedRevision: baseline.revision,
          ...(reasons.length
            ? { reasonCode: reason as MaintenanceTransitionInput['reasonCode'] }
            : {}),
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setBaseline(saved);
      setAction('');
      setReason('');
      onSaved(saved);
    } catch (value) {
      if (!controller.signal.aborted) {
        const problem = failure(value);
        setError(problem);
        if (problem.status === 409 || problem.status === 0 || problem.status >= 500) {
          setNeedsReview(true);
          await loadCurrent(controller);
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }
  function acceptReview() {
    if (!latest || reviewError || reviewLoading) return;
    setBaseline(latest);
    setLatest(undefined);
    setNeedsReview(false);
    setError(undefined);
  }
  return {
    baseline,
    action,
    setAction,
    reason,
    setReason,
    error,
    pending,
    needsReview,
    latest,
    reviewError,
    reviewLoading,
    review,
    save,
    acceptReview,
  };
}
