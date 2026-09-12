import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
import { Repository } from 'typeorm';
import { Device } from 'src/entity/device.entity';
import { DeviceActionLog } from 'src/entity/device-action-log.entity';
import {
  EActionResult,
  EActionSource,
  EDeviceStatus,
  EDeviceType,
} from 'src/utils/common/type';
import { pagination } from 'src/utils/common/handle';
import { PaginationResponse } from 'src/utils/common/interface';
import { CreateDeviceDto } from './dto/create-device.dto';
import { FanControlDto } from './dto/fan-control.dto';
import { GetDevicesDto } from './dto/get-devices.dto';
import { GetActionLogsDto } from './dto/get-action-logs.dto';
import { DeviceStatusResponseDto } from './dto/device-status.response.dto';
import { DeviceActionLogResponseDto } from './dto/device-action-log.response.dto';

@Injectable()
export class DevicesService {
  /** Event bus: emits every time a device is updated (fan on/off). */
  private readonly deviceUpdated$ = new Subject<Device>();

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    @InjectRepository(DeviceActionLog)
    private readonly actionLogRepo: Repository<DeviceActionLog>,
  ) {}

  /** SSE stream — controller subscribes and pushes to connected FE clients. */
  getDeviceStream(): Observable<Device> {
    return this.deviceUpdated$.asObservable();
  }

  /**
   * GET /devices — list Device[] with filters + pagination.
   *
   * Strategy pattern: each filter block is an independent strategy
   * applied to the QueryBuilder, making it easy to add/remove filters.
   */
  async getDevices(
    dto: GetDevicesDto,
  ): Promise<PaginationResponse<DeviceStatusResponseDto>> {
    const { roomId, type, status, limit, offset } = dto;

    const qb = this.deviceRepo
      .createQueryBuilder('device')
      .select([
        'device.id',
        'device.deviceId',
        'device.roomId',
        'device.name',
        'device.type',
        'device.status',
        'device.isOn',
        'device.lastSeen',
        'device.firmwareVersion',
      ]);

    if (roomId) {
      qb.andWhere('device.roomId = :roomId', { roomId });
    }
    if (type) {
      qb.andWhere('device.type = :type', { type });
    }
    if (status) {
      qb.andWhere('device.status = :status', { status });
    }

    qb.orderBy('device.created_at', 'DESC');

    return pagination(qb, { limit, offset });
  }

  async getDeviceStatus(deviceId: string): Promise<Device> {
    const device = await this.deviceRepo.findOne({ where: { deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  async createDevice(dto: CreateDeviceDto): Promise<Device> {
    const existed = await this.deviceRepo.findOne({
      where: { deviceId: dto.deviceId },
    });
    if (existed) {
      throw new ConflictException('Device already exists');
    }

    const device = this.deviceRepo.create({
      deviceId: dto.deviceId,
      roomId: dto.roomId,
      name: dto.name,
      type: dto.type,
      status: EDeviceStatus.OFFLINE,
      isOn: false,
      firmwareVersion: dto.firmwareVersion ?? null,
    });
    return this.deviceRepo.save(device);
  }

  /**
   * UC3.4 Manual Fan Control
   * Command intent is stored in the action-log payload (MQTT topic included).
   * ThresholdService should call autoControlFan() for UC3.3.
   */
  async controlFan(
    dto: FanControlDto,
    triggeredBy: string | null,
    source: EActionSource = EActionSource.MANUAL,
  ): Promise<Device> {
    const device = await this.deviceRepo.findOne({
      where: { deviceId: dto.deviceId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    if (device.type !== EDeviceType.FAN) {
      throw new BadRequestException('Not a fan device');
    }

    const action = dto.isOn ? 'FAN_ON' : 'FAN_OFF';
    const payload = {
      isOn: dto.isOn,
      reason:
        dto.reason ??
        (source === EActionSource.AUTO ? 'auto-threshold' : 'manual'),
      topic: `room/${device.roomId}/fan/command`,
      ts: Date.now(),
      source,
    };

    try {
      device.isOn = dto.isOn;
      device.status = EDeviceStatus.ONLINE;
      device.lastSeen = new Date();
      const saved = await this.deviceRepo.save(device);

      await this.actionLogRepo.save(
        this.actionLogRepo.create({
          deviceId: device.deviceId,
          roomId: device.roomId,
          action,
          source,
          result: EActionResult.SUCCESS,
          triggeredBy,
          payload,
        }),
      );

      this.deviceUpdated$.next(saved);
      return saved;
    } catch (err) {
      await this.actionLogRepo.save(
        this.actionLogRepo.create({
          deviceId: device.deviceId,
          roomId: device.roomId,
          action,
          source,
          result: EActionResult.FAILED,
          triggeredBy,
          payload,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        }),
      );
      throw err;
    }
  }

  /**
   * UC3.3 Automatic Fan Control — called by ThresholdService.
   */
  async autoControlFan(
    deviceId: string,
    isOn: boolean,
    extra: Record<string, any> = {},
  ): Promise<Device> {
    return this.controlFan(
      {
        deviceId,
        isOn,
        reason: extra.reason ?? (isOn ? 'auto-threshold' : 'back-in-range'),
      },
      extra.triggeredBy ?? 'system',
      EActionSource.AUTO,
    );
  }

  /**
   * GET /devices/logs — list DeviceActionLog[] with filters + pagination.
   */
  async getActionLogs(
    dto: GetActionLogsDto,
  ): Promise<PaginationResponse<DeviceActionLogResponseDto>> {
    const { deviceId, roomId, source, action, from, to, limit, offset } = dto;

    const qb = this.actionLogRepo
      .createQueryBuilder('log')
      .select([
        'log.id',
        'log.deviceId',
        'log.roomId',
        'log.action',
        'log.source',
        'log.result',
        'log.triggeredBy',
        'log.payload',
        'log.errorMessage',
      ]);

    if (deviceId) {
      qb.andWhere('log.deviceId = :deviceId', { deviceId });
    }
    if (roomId) {
      qb.andWhere('log.roomId = :roomId', { roomId });
    }
    if (source) {
      qb.andWhere('log.source = :source', { source });
    }
    if (action) {
      qb.andWhere('log.action = :action', { action });
    }
    if (from && to) {
      qb.andWhere('log.created_at BETWEEN :from AND :to', { from, to });
    } else if (from) {
      qb.andWhere('log.created_at >= :from', { from });
    } else if (to) {
      qb.andWhere('log.created_at <= :to', { to });
    }

    qb.orderBy('log.created_at', 'DESC');

    return pagination(qb, { limit, offset });
  }
}
