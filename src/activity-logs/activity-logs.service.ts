import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLog } from 'src/entity/activities.entity';
import { Repository } from 'typeorm';
import { pagination } from 'src/utils/common/handle';
import { PaginationResponse } from 'src/utils/common/interface';
import { CreateActivityLogDto, GetActivityLogsDto } from './activity-logs.dto';

@Injectable()
export class ActivityLogsService {

    constructor(
        @InjectRepository(ActivityLog)
        private activityLogRepository: Repository<ActivityLog>,
    ) {}

    async createLog(dto: CreateActivityLogDto, jwtPayload) {
        const log = this.activityLogRepository.create({
            description: dto.description,
            result: dto.result,
            metadata: dto.metadata,
            userId: jwtPayload.userId,
        });
        await this.activityLogRepository.save(log);
    }

    async getLogs(dto: GetActivityLogsDto): Promise<PaginationResponse<ActivityLog>> {
        const { userId, result, from, to, limit, offset } = dto;

        const qb = this.activityLogRepository
            .createQueryBuilder('log')
            .select([
                'log.id',
                'log.description',
                'log.userId',
                'log.result',
                'log.metadata',
            ])
            .addSelect('log.created_at');

        if (userId) {
            qb.andWhere('log.userId = :userId', { userId });
        }

        if (result) {
            qb.andWhere('log.result = :result', { result });
        }

        if (from && to) {
            qb.andWhere('log.created_at BETWEEN :from AND :to', { from, to });
        } else if (from) {
            qb.andWhere('log.created_at >= :from', { from });
        } else if (to) {
            qb.andWhere('log.created_at <= :to', { to });
        }

        qb.orderBy('log.created_at', 'DESC');

        return pagination(qb, { limit, offset });
    }
}
