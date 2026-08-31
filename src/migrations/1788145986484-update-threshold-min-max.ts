import { MigrationInterface, QueryRunner } from "typeorm";

export class updateThresholdMinMax1788145986484 implements MigrationInterface {
    name = 'updateThresholdMinMax1788145986484'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "thresholds" DROP COLUMN "temperature"`);
        await queryRunner.query(`ALTER TABLE "thresholds" ADD "minimum_temperature" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "thresholds" ADD "maximum_temperature" double precision NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "thresholds" DROP COLUMN "maximum_temperature"`);
        await queryRunner.query(`ALTER TABLE "thresholds" DROP COLUMN "minimum_temperature"`);
        await queryRunner.query(`ALTER TABLE "thresholds" ADD "temperature" double precision NOT NULL`);
    }

}
