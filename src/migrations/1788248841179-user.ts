import { MigrationInterface, QueryRunner } from "typeorm";

export class User1788248841179 implements MigrationInterface {
    name = 'User1788248841179'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_device_action_logs_device_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_device_action_logs_room_id"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "email" character varying(255) NOT NULL, "first_name" character varying(255), "last_name" character varying(255), "picture" text, "password" text NOT NULL, "salt" text, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`ALTER TABLE "activity-logs" DROP COLUMN "action"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activity-logs" ADD "action" character varying NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`CREATE INDEX "IDX_device_action_logs_room_id" ON "device_action_logs" ("room_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_device_action_logs_device_id" ON "device_action_logs" ("device_id") `);
    }

}
