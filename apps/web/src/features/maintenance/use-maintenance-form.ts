import { useEffect, useRef, useState } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import type { MaintenanceOrder, MaintenancePage } from './maintenance.types';
import {
  MaintenanceApiError,
  maintenancePath,
  readMaintenance,
  saveMaintenance,
  type MaintenanceInput,
} from './maintenance.api';
import {
  maintenanceDraft,
  validateMaintenanceDraft,
  type MaintenanceField,
} from './maintenance-draft';

export function useMaintenanceForm(
  vesselId: string,
  initial: MaintenanceOrder | undefined,
  onSaved: (order: MaintenanceOrder) => void,
) {
  const session = useAuthSession();
  const [draft, setDraft] = useState<MaintenanceInput>(() => maintenanceDraft(initial));
  const [baseline, setBaseline] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MaintenanceApiError>();
  const [needsReview, setNeedsReview] = useState(false);
  const [currentOrder, setCurrent] = useState<MaintenanceOrder>();
  const [reviewError, setReviewError] = useState<MaintenanceApiError>();
  const [reviewLoading, setReviewLoading] = useState(false);
  const [creationCheck, setCreationCheck] = useState<MaintenancePage>();
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
  async function loadCurrent(controller: AbortController, page = 1) {
    setReviewLoading(true);
    setCurrent(undefined);
    setCreationCheck(undefined);
    setReviewError(undefined);
    try {
      const token = await session.getAccessToken();
      if (controller.signal.aborted) return;
      if (!token)
        throw new MaintenanceApiError(401, 'SESSION_ENDED', 'Sign in again to continue.');
      if (baseline) {
        const record = await readMaintenance<MaintenanceOrder>(
          token,
          `${maintenancePath(vesselId)}/${encodeURIComponent(baseline.id)}`,
          controller.signal,
        );
        if (!controller.signal.aborted) setCurrent(record);
      } else {
        const orders = await readMaintenance<MaintenancePage>(
          token,
          `${maintenancePath(vesselId)}?page=${page}`,
          controller.signal,
        );
        if (!controller.signal.aborted) setCreationCheck(orders);
      }
    } catch (failure) {
      if (!controller.signal.aborted)
        setReviewError(
          failure instanceof MaintenanceApiError
            ? failure
            : new MaintenanceApiError(
                0,
                'UNAVAILABLE',
                'Current values could not be reached. Your draft is retained.',
              ),
        );
    } finally {
      if (!controller.signal.aborted) setReviewLoading(false);
    }
  }
  async function reviewCurrent(page = 1) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    await loadCurrent(controller, page);
    if (!controller.signal.aborted) request.current = null;
  }
  async function save() {
    if (
      request.current ||
      needsReview ||
      (error && [401, 403, 404].includes(error.status))
    )
      return;
    const errors = validateMaintenanceDraft(draft);
    if (Object.keys(errors).length) {
      setError(
        new MaintenanceApiError(
          400,
          'VALIDATION',
          'Check the highlighted fields.',
          undefined,
          errors,
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
      const path = `${maintenancePath(vesselId)}${baseline ? `/${encodeURIComponent(baseline.id)}` : ''}`;
      const saved = await saveMaintenance(
        token,
        path,
        {
          ...draft,
          title: draft.title.trim(),
          ...(baseline ? { expectedRevision: baseline.revision } : {}),
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setBaseline(initial ? saved : undefined);
      setDraft(maintenanceDraft(initial ? saved : undefined));
      onSaved(saved);
    } catch (failure) {
      if (!controller.signal.aborted) {
        const failureError =
          failure instanceof MaintenanceApiError
            ? failure
            : new MaintenanceApiError(
                0,
                'WRITE_UNCONFIRMED',
                'The write could not be confirmed. Check the currentOrder record before resubmitting.',
              );
        setError(failureError);
        if (
          failureError.code === 'MAINTENANCE_STALE_WRITE' ||
          failureError.code === 'MAINTENANCE_ORDER_FINAL' ||
          failureError.status === 0 ||
          failureError.status >= 500
        ) {
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
  const acceptReview = () => {
    if (!currentOrder || ['CLOSED', 'CANCELLED'].includes(currentOrder.status)) return;
    setBaseline(currentOrder);
    setCurrent(undefined);
    setNeedsReview(false);
    setError(undefined);
  };
  const useCurrent = (field: MaintenanceField) => {
    if (currentOrder)
      setDraft((previous) => ({
        ...previous,
        [field]: maintenanceDraft(currentOrder)[field],
      }));
  };
  const acceptCreationRetry = () => {
    if (creationCheck && !reviewLoading && !reviewError) {
      setNeedsReview(false);
      setCreationCheck(undefined);
      setError(undefined);
    }
  };
  return {
    draft,
    setDraft,
    baseline,
    pending,
    error,
    save,
    needsReview,
    currentOrder,
    creationCheck,
    acceptCreationRetry,
    reviewError,
    reviewLoading,
    reviewCurrent,
    acceptReview,
    useCurrent,
  };
}
