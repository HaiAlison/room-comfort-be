import { MigrationInterface, QueryRunner } from "typeorm";

export class alert1786429412277 implements MigrationInterface {
    name = 'alert1786429412277'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "room_id" character varying NOT NULL, "alert_type" character varying NOT NULL, "alert_message" character varying NOT NULL, "alert_status" character varying NOT NULL, "is_resolved" boolean NOT NULL DEFAULT false, "resolved_at" TIMESTAMP, "resolved_by" character varying, "threshold" jsonb, "is_read" boolean NOT NULL DEFAULT false, "is_muted" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "alerts"`);
    }

}
