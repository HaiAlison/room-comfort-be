import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from 'src/entity/device.entity';
import { DeviceActionLog } from 'src/entity/device-action-log.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Device, DeviceActionLog])],
  controllers: [DevicesController],
  providers: [DevicesService],
  // Export so ThresholdModule can inject DevicesService.autoControlFan()
  exports: [DevicesService],
})
export class DevicesModule {}
