import { MigrationInterface, QueryRunner } from "typeorm";

export class sensorReading1787503004266 implements MigrationInterface {
    name = 'sensorReading1787503004266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sensor_readings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "room_id" character varying, "temperature" double precision NOT NULL, CONSTRAINT "PK_ae97fcc8df9e5662d9d007d102b" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "sensor_readings"`);
    }

}
