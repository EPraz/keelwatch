export const demoRecordId = (kind, index) =>
  `5eed000${kind}-0000-4000-8000-${String(index).padStart(12, '0')}`;

export function demoScenarios(referenceDay) {
  const date = (offset) => new Date(referenceDay.getTime() + offset * 86_400_000);
  const vessels = ['Aurora', 'Beacon', 'Coral', 'Drift', 'Harbor'].map((name, index) => ({
    id: demoRecordId(1, index + 1),
    name: `MV Demo ${name}`,
    registryNumber: `KW-97000${index + 1}`,
    status: index === 4 ? 'ARCHIVED' : 'ACTIVE',
  }));
  const certificates = [365, 14, -14].map((expires, index) => ({
    id: demoRecordId(2, index + 1),
    vesselId: vessels[index].id,
    referenceNumber: `DEMO-SAFETY-97000${index + 1}`,
    issuer: 'Synthetic Demo Registry',
    issuedOn: date(-365),
    expiresOn: date(expires),
  }));
  certificates.push({
    id: demoRecordId(2, 4),
    vesselId: vessels[0].id,
    referenceNumber: 'DEMO-SAFETY-970004-ARCHIVED',
    issuer: 'Synthetic Demo Registry',
    issuedOn: date(-730),
    expiresOn: date(-366),
    archivedAt: date(0),
  });
  const crew = [
    'Avery Rowan',
    'Blake Quinn',
    'Casey Ellis',
    'Drew Morgan',
    'Ellis Lane',
  ].map((name, index) => ({
    id: demoRecordId(3, index + 1),
    displayName: `${name} (demo)`,
    crewNumber: `KW-C-97000${index + 1}`,
  }));
  const qualifications = [
    [0, 'DEMO_SAFETY', -365, 730],
    [0, 'DEMO_DECK', -365, 730],
    [1, 'DEMO_SAFETY', -365, 730],
    [1, 'DEMO_DECK', -365, 14],
    [2, 'DEMO_SAFETY', -365, -14],
    [3, 'DEMO_SAFETY', 30, 730],
    [3, 'DEMO_DECK', 30, 730],
  ].map(([member, kind, from, to], index) => ({
    id: demoRecordId(4, index + 1),
    crewMemberId: crew[member].id,
    kind,
    referenceNumber: `KW-Q-97000${index + 1}`,
    validFrom: date(from),
    expiresOn: date(to),
  }));
  const assignments = [
    [0, 0, 'DEMO_DECK', -7, 365],
    [0, 1, 'DEMO_DECK', -7, 7],
    [1, 2, 'DEMO_SUPPORT', -7, 14],
    [1, 2, 'DEMO_SUPPORT', -90, -60],
    [2, 3, 'DEMO_DECK', 45, 75],
    [3, 4, 'DEMO_SUPPORT', -3, 10],
  ].map(([vessel, member, role, from, to], index) => ({
    id: demoRecordId(5, index + 1),
    vesselId: vessels[vessel].id,
    crewMemberId: crew[member].id,
    role,
    startsOn: date(from),
    endsOn: date(to),
    ...(index === 5 ? { cancelledAt: date(0), cancellationReason: 'PLAN_CHANGED' } : {}),
  }));
  const maintenance = [
    [0, 'Inspect synthetic deck lighting', 'INSPECTION', 'HIGH', 'OPEN', null, null],
    [0, 'Service demo ventilation unit', 'PREVENTIVE', 'NORMAL', 'PLANNED', 7, null],
    [2, 'Repair synthetic cooling pump', 'CORRECTIVE', 'HIGH', 'IN_PROGRESS', -2, null],
    [
      1,
      'Replace demo valve assembly',
      'CORRECTIVE',
      'HIGH',
      'BLOCKED',
      -7,
      'AWAITING_RESOURCES',
    ],
    [0, 'Completed demo equipment check', 'PREVENTIVE', 'LOW', 'CLOSED', -7, null],
    [
      3,
      'Cancelled duplicate demo inspection',
      'INSPECTION',
      'LOW',
      'CANCELLED',
      4,
      'WORK_NO_LONGER_REQUIRED',
    ],
  ].map(([vessel, title, category, priority, status, target, reasonCode], index) => ({
    id: demoRecordId(6, index + 1),
    vesselId: vessels[vessel].id,
    title,
    category,
    priority,
    status,
    reasonCode,
    targetDate: target === null ? null : date(target),
    revision: 1,
  }));
  return { vessels, certificates, crew, qualifications, assignments, maintenance };
}
