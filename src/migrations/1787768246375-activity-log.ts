import { MigrationInterface, QueryRunner } from "typeorm";

export class activityLog1787768246375 implements MigrationInterface {
    name = 'activityLog1787768246375'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "activity-logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "description" character varying NOT NULL, "user_id" character varying NOT NULL, "action" character varying NOT NULL, "result" character varying NOT NULL, "metadata" jsonb, CONSTRAINT "PK_07eaeb64a9e3b336b4b8a522d97" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "activity-logs"`);
    }

}
