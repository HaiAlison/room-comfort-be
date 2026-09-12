import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UpdateThresholdDto {
  @ApiProperty({
    example: 20,
  })
  @Type(() => Number)
  @IsNumber()
  minimumTemperature: number;

  @ApiProperty({
    example: 30,
  })
  @Type(() => Number)
  @IsNumber()
  maximumTemperature: number;
}