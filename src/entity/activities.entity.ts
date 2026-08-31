import { EAlertSeverity, EAlertStatus } from "src/utils/common/type";
import { BaseTimeStampEntity } from "src/utils/config/database/base-entity";
import { Column, Entity, VirtualColumn } from "typeorm";

@Entity("activity-logs")
export class ActivityLog extends BaseTimeStampEntity {

    @Column({ name: 'description' })
    description: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'result' })
    result: string;

    @Column({ type: 'jsonb', name: 'metadata', nullable: true })
    metadata: Record<string, any>;
}