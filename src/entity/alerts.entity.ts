import { EAlertSeverity, EAlertStatus } from "src/utils/common/type";
import { BaseTimeStampEntity } from "src/utils/config/database/base-entity";
import { Column, Entity, VirtualColumn } from "typeorm";

@Entity("alerts")
export class Alert extends BaseTimeStampEntity {
    @Column({ name: 'room_id', nullable: true })
    roomId: string;

    @Column({ enum: EAlertSeverity, default: EAlertSeverity.INFO })
    severity: EAlertSeverity;

    @Column({ name: 'message' })
    message: string;

    @Column({ enum: EAlertStatus, default: EAlertStatus.ACTIVE })
    status: EAlertStatus;

    @Column({ name: 'resolved_at', nullable: true })
    resolvedAt: Date;

    @Column({ name: 'resolved_by', nullable: true })
    resolvedBy: string;

    @Column({ type: 'jsonb', name: 'threshold', nullable: true })
    threshold: Record<string, any>;

    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @VirtualColumn({
        query: (alias) => `COALESCE(${alias}.resolved_at, ${alias}.created_at)`
    })
    timestamp: Date;
}