import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/http/api-exception';
import { FleetService } from '../../fleet/application/fleet.service';
import { deriveNotificationConditions } from '../domain/notification';
import {
  COMPLIANCE_REPOSITORY,
  type ComplianceRepository,
} from '../ports/compliance.repository';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../ports/notification.repository';

const FAILURE_CODE = 'COMPLIANCE_NOTIFICATION_JOB_FAILED';

@Injectable()
export class NotificationJobService {
  private execution: Promise<void> = Promise.resolve();

  constructor(
    private readonly fleet: FleetService,
    @Inject(COMPLIANCE_REPOSITORY)
    private readonly compliance: ComplianceRepository,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async enqueue(triggeredById: string) {
    const result = await this.notifications.enqueue(triggeredById);
    this.schedule(result.run.id);
    return result.run;
  }

  watch() {
    return this.notifications.watch();
  }

  async findRun(id: string) {
    const run = await this.notifications.findRun(id);
    if (!run) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'NOTIFICATION_JOB_NOT_FOUND',
        'The requested notification job was not found.',
      );
    }
    return run;
  }

  runNow(id: string): Promise<void> {
    return this.execute(id);
  }

  private schedule(id: string): void {
    this.execution = this.execution
      .catch(() => undefined)
      .then(() => this.execute(id))
      .catch(() => undefined);
  }

  private async execute(id: string): Promise<void> {
    const claimed = await this.notifications.markRunning(id);
    if (!claimed) return;
    try {
      const vessels = await this.fleet.listActiveRecords();
      const data = await this.compliance.findQueueData(
        vessels.map((vessel) => vessel.id),
      );
      const conditions = deriveNotificationConditions({
        ...data,
        vessels,
        asOf: new Date(),
      });
      await this.notifications.complete(id, conditions);
    } catch {
      await this.notifications.fail(id, FAILURE_CODE);
    }
  }
}
