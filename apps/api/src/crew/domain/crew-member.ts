export interface CrewMemberRecord {
  readonly id: string;
  readonly displayName: string;
  readonly crewNumber: string;
  readonly createdAt: Date;
}

export class CrewNumberConflictError extends Error {
  constructor() {
    super('A crew profile already uses this crew number.');
  }
}
