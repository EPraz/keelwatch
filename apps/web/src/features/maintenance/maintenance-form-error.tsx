import { Toast } from '../../app/toast';
import type { Ref } from 'react';
import { Link } from 'react-router-dom';
import type { MaintenanceApiError } from './maintenance.api';
import { maintenanceFieldLabels, type MaintenanceField } from './maintenance-draft';

export function MaintenanceFormError({
  error,
  summaryRef,
}: {
  error: MaintenanceApiError;
  summaryRef: Ref<HTMLDivElement>;
}) {
  return (
    <Toast role="alert" tabIndex={-1} ref={summaryRef}>
      <p>{error.message}</p>
      {error.correlationId ? <p>Error reference: {error.correlationId}</p> : null}
      {error.status === 401 ? <Link to="/sign-in">Sign in again</Link> : null}
      {Object.entries(error.fieldErrors ?? {}).map(([field, errors]) => (
        <p key={field}>
          {maintenanceFieldLabels[field as MaintenanceField] ??
            (field === 'reasonCode' ? 'Reason' : field)}
          : {errors.join(' ')}
        </p>
      ))}
    </Toast>
  );
}
