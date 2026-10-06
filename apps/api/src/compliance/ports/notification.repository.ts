import type {
  NotificationCondition,
  NotificationJobRunRecord,
  NotificationWatch,
} from '../domain/notification';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface EnqueueNotificationRunResult {
  readonly run: NotificationJobRunRecord;
  readonly created: boolean;
}

export interface NotificationRepository {
  enqueue(triggeredById: string): Promise<EnqueueNotificationRunResult>;
  markRunning(id: string): Promise<boolean>;
  complete(
    id: string,
    conditions: readonly NotificationCondition[],
  ): Promise<NotificationJobRunRecord>;
  fail(id: string, failureCode: string): Promise<NotificationJobRunRecord>;
  findRun(id: string): Promise<NotificationJobRunRecord | null>;
  watch(): Promise<NotificationWatch>;
}
