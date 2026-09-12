import { EDeviceStatus, EDeviceType } from "src/utils/common/type";
import { BaseTimeStampEntity } from "src/utils/config/database/base-entity";
import { Column, Entity } from "typeorm";

@Entity("devices")
export class Device extends BaseTimeStampEntity {
    @Column({ name: 'device_id', unique: true })
    deviceId: string;

    @Column({ name: 'room_id' })
    roomId: string;

    @Column({ name: 'name' })
    name: string;

    @Column({ enum: EDeviceType })
    type: EDeviceType;

    @Column({ enum: EDeviceStatus, default: EDeviceStatus.OFFLINE })
    status: EDeviceStatus;

    @Column({ name: 'is_on', default: false })
    isOn: boolean;

    @Column({ name: 'last_seen', type: 'timestamptz', nullable: true })
    lastSeen: Date;

    @Column({ name: 'firmware_version', nullable: true })
    firmwareVersion: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;
}
