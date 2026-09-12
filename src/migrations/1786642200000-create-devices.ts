import { MigrationInterface, QueryRunner } from "typeorm";

export class createDevices1786642200000 implements MigrationInterface {
    name = 'createDevices1786642200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "device_id" character varying NOT NULL, "room_id" character varying NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'OFFLINE', "is_on" boolean NOT NULL DEFAULT false, "last_seen" TIMESTAMP WITH TIME ZONE, "firmware_version" character varying, "metadata" jsonb, CONSTRAINT "UQ_devices_device_id" UNIQUE ("device_id"), CONSTRAINT "PK_devices_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "device_action_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "device_id" character varying NOT NULL, "room_id" character varying NOT NULL, "action" character varying NOT NULL, "source" character varying NOT NULL, "result" character varying NOT NULL, "triggered_by" character varying, "payload" jsonb, "error_message" character varying, CONSTRAINT "PK_device_action_logs_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_device_action_logs_device_id" ON "device_action_logs" ("device_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_device_action_logs_room_id" ON "device_action_logs" ("room_id")`);
        await queryRunner.query(`INSERT INTO "devices" ("device_id", "room_id", "name", "type", "status", "is_on", "firmware_version") VALUES ('esp32-room-01-fan', 'room-01', 'Quạt phòng 01', 'FAN', 'ONLINE', false, '1.0.0'), ('esp32-room-01-buzzer', 'room-01', 'Buzzer phòng 01', 'BUZZER', 'ONLINE', false, '1.0.0')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_device_action_logs_room_id"`);
        await queryRunner.query(`DROP INDEX "IDX_device_action_logs_device_id"`);
        await queryRunner.query(`DROP TABLE "device_action_logs"`);
        await queryRunner.query(`DROP TABLE "devices"`);
    }

}
