import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UpdateThresholdDto {
  @ApiProperty({
    example: 30,
    description: 'Ngưỡng nhiệt độ',
  })
  @Type(() => Number)
  @IsNumber()
  temperature: number;
}