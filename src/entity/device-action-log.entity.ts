import { EActionResult, EActionSource } from "src/utils/common/type";
import { BaseTimeStampEntity } from "src/utils/config/database/base-entity";
import { Column, Entity } from "typeorm";

@Entity("device_action_logs")
export class DeviceActionLog extends BaseTimeStampEntity {
    @Column({ name: 'device_id' })
    deviceId: string;

    @Column({ name: 'room_id' })
    roomId: string;

    @Column({ name: 'action' })
    action: string;

    @Column({ enum: EActionSource })
    source: EActionSource;

    @Column({ enum: EActionResult })
    result: EActionResult;

    @Column({ name: 'triggered_by', nullable: true })
    triggeredBy: string;

    @Column({ type: 'jsonb', nullable: true })
    payload: Record<string, any>;

    @Column({ name: 'error_message', nullable: true })
    errorMessage: string;
}
