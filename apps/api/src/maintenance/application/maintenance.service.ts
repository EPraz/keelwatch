import { maintenanceDate, maintenanceView } from './maintenance-values';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../../audit/application/audit-event.writer';
import { FleetService } from '../../fleet/application/fleet.service';
import { ApiException } from '../../common/http/api-exception';
import type {
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  MaintenanceQueryDto,
  TransitionMaintenanceDto,
} from '../http/maintenance.dto';
import { PrismaMaintenanceEditor } from '../infrastructure/prisma-maintenance-editor';
import { PrismaMaintenanceLifecycle } from '../infrastructure/prisma-maintenance-lifecycle';
import { MaintenanceAssigneeDirectory } from '../../access/application/maintenance-assignee.directory';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fleet: FleetService,
    private readonly assignees: MaintenanceAssigneeDirectory,
    private readonly editor: PrismaMaintenanceEditor,
    private readonly lifecycle: PrismaMaintenanceLifecycle,
    @Inject(AUDIT_EVENT_WRITER) private readonly audit: AuditEventWriter,
  ) {}

  async list(vesselId: string, query: MaintenanceQueryDto) {
    await this.fleet.findRecordById(vesselId);
    const where = { vesselId, status: query.status, priority: query.priority };
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.maintenanceOrder.findMany({
          where,
          skip: (query.page - 1) * 5,
          take: 5,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { assignee: { select: { id: true, displayName: true } } },
        }),
        this.prisma.maintenanceOrder.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      items: items.map(maintenanceView),
      page: query.page,
      pageSize: 5,
      total,
      totalPages: Math.ceil(total / 5),
    };
  }
  async transition(
    vesselId: string,
    orderId: string,
    body: TransitionMaintenanceDto,
    actorUserId: string,
    correlationId: string,
  ) {
    await this.fleet.findRecordById(vesselId);
    return maintenanceView(
      await this.lifecycle.transition(
        vesselId,
        orderId,
        body,
        actorUserId,
        correlationId,
      ),
    );
  }
  async eligibleAssignees(vesselId: string, page: number) {
    await this.fleet.findRecordById(vesselId);
    return this.assignees.list(page);
  }

  async detail(vesselId: string, orderId: string) {
    const vessel = await this.fleet.findRecordById(vesselId);
    const record = await this.prisma.maintenanceOrder.findFirst({
      where: { id: orderId, vesselId },
      include: { assignee: { select: { id: true, displayName: true } } },
    });
    if (!record)
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'MAINTENANCE_ORDER_NOT_FOUND',
        'No maintenance order was found in this vessel.',
      );
    return {
      ...maintenanceView(record),
      vesselName: vessel.name,
      vesselRegistryNumber: vessel.registryNumber,
    };
  }

  async create(
    vesselId: string,
    body: CreateMaintenanceDto,
    actorUserId: string,
    correlationId: string,
  ) {
    const targetDate = maintenanceDate(body.targetDate) ?? null;
    const record = await this.prisma.$transaction(async (transaction) => {
      const vessel = await this.fleet.findRecordById(vesselId, transaction);
      if (vessel.status !== 'ACTIVE')
        throw new ApiException(
          HttpStatus.CONFLICT,
          'VESSEL_ARCHIVED',
          'Archived vessels cannot receive new maintenance orders.',
        );
      if (
        body.assigneeId &&
        !(await this.assignees.findEligible(body.assigneeId, transaction))
      )
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'MAINTENANCE_ASSIGNEE_INELIGIBLE',
          'Choose an active user permitted to manage maintenance.',
          { assigneeId: ['Choose an eligible responsible user.'] },
        );
      const order = await transaction.maintenanceOrder.create({
        data: { vesselId, ...body, targetDate, createdById: actorUserId },
        include: { assignee: { select: { id: true, displayName: true } } },
      });
      await this.audit.append(transaction, {
        actorUserId,
        correlationId,
        action: 'MAINTENANCE_ORDER_CREATED',
        entityType: 'MAINTENANCE_ORDER',
        entityId: order.id,
        metadata: {
          vesselId,
          title: order.title,
          category: order.category,
          priority: order.priority,
          status: order.status,
          assigneeId: order.assigneeId ?? '',
          targetDate: body.targetDate ?? '',
          revision: '1',
        },
      });
      return order;
    });
    return maintenanceView(record);
  }

  async update(
    vesselId: string,
    orderId: string,
    body: UpdateMaintenanceDto,
    actorUserId: string,
    correlationId: string,
  ) {
    await this.fleet.findRecordById(vesselId);
    const targetDate = maintenanceDate(body.targetDate);
    const record = await this.editor.update(
      vesselId,
      orderId,
      body,
      targetDate,
      actorUserId,
      correlationId,
    );
    return maintenanceView(record);
  }
}
