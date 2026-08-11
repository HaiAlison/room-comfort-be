import { BaseTimeStampEntity } from "src/utils/config/database/base-entity";
import { Column, Entity } from "typeorm";

@Entity("alerts")
export class Alert extends BaseTimeStampEntity {
    @Column({ name: 'room_id' })
    roomId: string;

    @Column({ name: 'alert_type' })
    alertType: string;

    @Column({ name: 'alert_message' })
    alertMessage: string;

    @Column({ name: 'alert_status' })
    alertStatus: string;

    @Column({ name: 'is_resolved', default: false })
    isResolved: boolean;

    @Column({ name: 'resolved_at', nullable: true })
    resolvedAt: Date;

    @Column({ name: 'resolved_by', nullable: true })
    resolvedBy: string;

    @Column({ type: 'jsonb', name: 'threshold', nullable: true })
    threshold: Record<string, any>;

    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @Column({ name: 'is_muted', default: false })
    isMuted: boolean;
}