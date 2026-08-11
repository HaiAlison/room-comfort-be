import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from 'src/entity/alerts.entity';
import { pagination } from 'src/utils/common/handle';
import { PaginationResponse } from 'src/utils/common/interface';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { AlertItemResponseDto } from './dto/alert-item.response.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
  ) {}

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
      alertType,
      alertStatus,
      isResolved,
      isRead,
      isMuted,
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
        'alert.alertType',
        'alert.alertMessage',
        'alert.alertStatus',
        'alert.isResolved',
        'alert.resolvedAt',
        'alert.resolvedBy',
        'alert.threshold',
        'alert.isRead',
        'alert.isMuted',
      ]);

    // --- Filter strategies ---
    if (roomId) {
      qb.andWhere('alert.roomId = :roomId', { roomId });
    }

    if (alertType) {
      qb.andWhere('alert.alertType = :alertType', { alertType });
    }

    if (alertStatus) {
      qb.andWhere('alert.alertStatus = :alertStatus', { alertStatus });
    }

    if (isResolved !== undefined) {
      qb.andWhere('alert.isResolved = :isResolved', { isResolved });
    }

    if (isRead !== undefined) {
      qb.andWhere('alert.isRead = :isRead', { isRead });
    }

    if (isMuted !== undefined) {
      qb.andWhere('alert.isMuted = :isMuted', { isMuted });
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
    return this.alertsRepository.save(alert);
  }
}
