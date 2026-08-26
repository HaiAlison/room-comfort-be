import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import { Alert } from 'src/entity/alerts.entity';
import { pagination } from 'src/utils/common/handle';
import { PaginationResponse } from 'src/utils/common/interface';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { AlertItemResponseDto } from './dto/alert-item.response.dto';
import { EAlertStatus } from 'src/utils/common/type';

@Injectable()
export class AlertsService {
  /** Event bus: emits every time a new Alert is persisted. */
  private readonly alertCreated$ = new Subject<Alert>();

  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
  ) {}

  /** SSE stream — controller subscribes and pushes to connected FE clients. */
  getAlertStream(): Observable<Alert> {
    return this.alertCreated$.asObservable();
  }

  /**
   * GET /alerts — list AlertItem[] with filters + pagination.
   *
   * Strategy pattern: each filter block is an independent strategy
   * applied to the QueryBuilder, making it easy to add/remove filters.
   */
  async getAlerts(
    dto: GetAlertsDto,
  ): Promise<PaginationResponse<AlertItemResponseDto>> {
    const {
      roomId,
      severity,
      status,
      resolved,
      isRead,
      from,
      to,
      limit,
      offset,
    } = dto;

    const qb = this.alertsRepository
      .createQueryBuilder('alert')
      .select([
        'alert.id',
        'alert.roomId',
        'alert.message',
        'alert.status',
        'alert.severity',
        'alert.resolvedAt',
        'alert.resolvedBy',
        'alert.threshold',
        'alert.isRead',
      ]).addSelect('alert.timestamp');

    // --- Filter strategies ---
    if (roomId) {
      qb.andWhere('alert.roomId = :roomId', { roomId });
    }

    if (severity) {
      qb.andWhere('alert.severity = :severity', { severity });
    }

    if (status) {
      qb.andWhere('alert.status = :status', { status });
    }

    if (resolved !== undefined) {
      qb.andWhere('alert.isResolved = :resolved', { resolved });
    }

    if (isRead !== undefined) {
      qb.andWhere('alert.isRead = :isRead', { isRead });
    }

    // Date range filter on created_at
    if (from && to) {
      qb.andWhere('alert.created_at BETWEEN :from AND :to', { from, to });
    } else if (from) {
      qb.andWhere('alert.created_at >= :from', { from });
    } else if (to) {
      qb.andWhere('alert.created_at <= :to', { to });
    }

    qb.orderBy('alert.created_at', 'DESC');

    return pagination(qb, { limit, offset });
  }

  /**
   * Create a new alert.
   *
   * TODO (Threshold integration): When ThresholdService detects a triggered
   * threshold, it will call this method to persist the alert record.
   * ThresholdService should build the `Alert` payload (including `threshold`
   * jsonb snapshot) and pass it here.
   */
  async createAlert(payload: Partial<Alert>): Promise<Alert> {
    const alert = this.alertsRepository.create(payload);
    const saved = await this.alertsRepository.save(alert);
    // Notify all SSE subscribers that a new alert has been created
    this.alertCreated$.next(saved);
    return saved;
  }

  async resolveAlert(id: string, dto: Partial<Alert>): Promise<Alert> {
    const alert = await this.alertsRepository.findOneBy({ id, });
    if (!alert) {
      throw new Error('Alert not found');
    }
    alert.isRead = true;
    alert.status = EAlertStatus.RESOLVED;
    const saved = await this.alertsRepository.save(alert);
    return saved;
  }
}
