import { Inject, Injectable } from '@nestjs/common';
import { FleetService } from '../../fleet/application/fleet.service';
import {
  deriveComplianceQueue,
  type ComplianceQueuePage,
  type ComplianceQueueQuery,
} from '../domain/compliance-queue';
import {
  COMPLIANCE_REPOSITORY,
  type ComplianceRepository,
} from '../ports/compliance.repository';

@Injectable()
export class ComplianceQueueService {
  constructor(
    private readonly fleet: FleetService,
    @Inject(COMPLIANCE_REPOSITORY)
    private readonly compliance: ComplianceRepository,
  ) {}

  async list(query: ComplianceQueueQuery): Promise<ComplianceQueuePage> {
    const vessels = await this.fleet.listActiveRecords();
    const data = await this.compliance.findQueueData(vessels.map((vessel) => vessel.id));
    return deriveComplianceQueue({ ...data, vessels, query, asOf: new Date() });
  }
}
