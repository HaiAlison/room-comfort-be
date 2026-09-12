import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { FromToCommonDto } from 'src/utils/common/dto';

export class CreateActivityLogDto {
    @ApiPropertyOptional({
        description: 'Description of the activity',
    })
    @IsString()
    description: string;

    @ApiPropertyOptional({
        description: 'Type of the activity',
    })
    @IsString()
    type: string;

    @ApiPropertyOptional({
        description: 'Action of the activity',
    })
    @IsString()
    action: string;

    @ApiPropertyOptional({
        description: 'Result of the activity',
    })
    @IsString()
    result: string;

    @ApiPropertyOptional({
        description: 'Metadata of the activity',
    })
    @IsOptional()
    @IsObject()
    metadata: Record<string, any>;
}

export class GetActivityLogsDto extends FromToCommonDto {
    @ApiPropertyOptional({ description: 'Filter by user ID' })
    @IsString()
    @IsOptional()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by result' })
    @IsString()
    @IsOptional()
    result?: string;
}