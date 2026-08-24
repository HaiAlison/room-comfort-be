import { MigrationInterface, QueryRunner } from "typeorm";

export class threshold1787544666891 implements MigrationInterface {
    name = 'threshold1787544666891'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "thresholds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "temperature" double precision NOT NULL, CONSTRAINT "PK_99586c2ba61a0e7056915851d8c" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "thresholds"`);
    }

}
