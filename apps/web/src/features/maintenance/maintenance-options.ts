export const maintenanceStatuses = [
  'OPEN',
  'PLANNED',
  'IN_PROGRESS',
  'BLOCKED',
  'CLOSED',
  'CANCELLED',
];
export const maintenancePriorities = ['LOW', 'NORMAL', 'HIGH'];
export const maintenanceLabel = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./u, (letter) => letter.toUpperCase());
