import { MigrationInterface, QueryRunner } from "typeorm";

export class createFanState1788178622395 implements MigrationInterface {
    name = 'createFanState1788178622395'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "fan_states" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "room_id" character varying, "is_on" boolean NOT NULL DEFAULT false, "mode" character varying NOT NULL DEFAULT 'auto', "reason" character varying, CONSTRAINT "PK_6b713f2aea1898a4c50e2036dbe" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "fan_states"`);
    }

}
