import { useNavigate } from 'react-router-dom';
import { createVessel, updateVessel } from './fleet.api';
import type { VesselDetail } from './fleet.types';
import { VesselForm } from './vessel-form';

export function VesselCreateForm() {
  const navigate = useNavigate();
  return (
    <VesselForm
      initialValues={{ name: '', registryNumber: '' }}
      errorEyebrow="Registration interrupted"
      submitLabel="Register vessel"
      pendingLabel="Registering vessel…"
      cancelTo="/app/vessels"
      save={createVessel}
      onSaved={(vessel) => {
        void navigate('/app/vessels', {
          replace: true,
          state: { createdRegistryNumber: vessel.registryNumber },
        });
      }}
    />
  );
}

export function VesselEditForm({ vessel }: { readonly vessel: VesselDetail }) {
  const navigate = useNavigate();
  const detailPath = `/app/vessels/${vessel.id}`;
  return (
    <VesselForm
      initialValues={{ name: vessel.name, registryNumber: vessel.registryNumber }}
      errorEyebrow="Update interrupted"
      submitLabel="Save vessel"
      pendingLabel="Saving vessel…"
      cancelTo={detailPath}
      save={(accessToken, input) => updateVessel(accessToken, vessel.id, input)}
      onSaved={(updated) => {
        void navigate(detailPath, {
          replace: true,
          state: { updatedRegistryNumber: updated.registryNumber },
        });
      }}
    />
  );
}
