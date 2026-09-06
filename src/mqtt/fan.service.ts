import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MqttClient } from 'mqtt';
import { Observable, Subject } from 'rxjs';

import { AlertsService } from 'src/alerts/alerts.service';
import { MonitoringService } from 'src/monitoring/monitoring.service';
import { ThresholdService } from 'src/threshold/threshold.service';
import {
  EAlertSeverity,
  EAlertStatus,
  FanReason,
} from 'src/utils/common/type';

@Injectable()
export class FanService {
  private readonly logger =
    new Logger(FanService.name);

  private client?: MqttClient;

  private fanOn = false;

  private fanMode: 'auto' | 'manual' = 'auto';

  private fanReason: FanReason =
    'Temperature normalized';

  private fanUpdatedAt =
    new Date().toISOString();

  /** Event bus: emits fan state every time it changes. */
  private readonly fanUpdated$ =
    new Subject<ReturnType<FanService['getFanState']>>();

  /** Deduplicate SSE — only push when state actually changed. */
  private lastEmittedFanKey: string | null =
    null;

  constructor(
    private readonly configService: ConfigService,
    private readonly thresholdService: ThresholdService,
    private readonly monitoringService: MonitoringService,
    private readonly alertService: AlertsService,
  ) {}

  /** Called by MqttService after broker connects. */
  setClient(client: MqttClient) {
    this.client = client;
  }

  // ── Public API (used by DeviceController) ──

  getFanState() {
    return {
      on: this.fanOn,
      reason: this.fanReason,
      mode: this.fanMode,
      updatedAt: this.fanUpdatedAt,
    };
  }

  /** SSE stream of fan state changes for `GET /devices/fan/events`. */
  getFanStream(): Observable<
    ReturnType<FanService['getFanState']>
  > {
    return this.fanUpdated$.asObservable();
  }

  /** Manual mode — user trực tiếp bật/tắt quạt. */
  async setManualFan(on: boolean) {
    const previousMode = this.fanMode;

    this.fanMode = 'manual';

    try {
      if (on) {
        await this.turnOn('Manual override');
      } else {
        await this.turnOff('Manual override');
      }
    } catch (error) {
      this.fanMode = previousMode;
      throw error;
    }

    return this.getFanState();
  }

  async setFanMode(mode: 'auto' | 'manual') {
    this.fanMode = mode;

    this.fanUpdatedAt =
      new Date().toISOString();

    this.emitFanState();

    // Khi chuyển sang auto, evaluate ngay nhiệt độ hiện tại
    if (mode === 'auto') {
      const reading =
        await this.monitoringService
          .getCurrentTemperature();

      if (reading) {
        await this.evaluateFan(
          reading.temperature,
        );
      }
    }

    return this.getFanState();
  }

  // ── Auto evaluation (called by MqttService on temperature received) ──

  /**
   * Auto mode — đánh giá nhiệt độ và điều khiển quạt tự động:
   *   - Trên ngưỡng max → bật quạt
   *   - Dưới ngưỡng min → tắt quạt
   *   - Trong ngưỡng [min, max] → không làm gì (giữ nguyên)
   */
  async evaluateFan(temperature: number) {
    if (this.fanMode === 'manual') {
      return;
    }
    const command =
      await this.thresholdService
        .evaluateTemperature(temperature);
    console.log('evaluate', temperature, ' command', command)

    // Trong ngưỡng → không can thiệp
    if (!command) {
      console.log('noting ')
      return;
    }

    // Trạng thái đã đúng → không gửi lệnh thừa
    if (command === 'ON' && this.fanOn) {
      return;
    }
    if (command === 'OFF' && !this.fanOn) {
      return;
    }

    // Trên ngưỡng → bật quạt
    if (command === 'ON') {
      this.logger.log(
        `Temperature exceeded threshold: ${temperature}`,
      );

      await this.alertService.createAlert({
        severity: EAlertSeverity.CRITICAL,
        message: `Temperature exceeded threshold: ${temperature}`,
        status: EAlertStatus.ACTIVE,
        threshold: { maximumTemperature: temperature },
      });

      await this.turnOn('Temperature exceeded threshold');
      return;
    }

    // Dưới ngưỡng → tắt quạt
    this.logger.log(
      `Temperature normalized: ${temperature}`,
    );

    await this.alertService.createAlert({
      severity: EAlertSeverity.INFO,
      message: `Temperature has been normalized: ${temperature}`,
      status: EAlertStatus.RESOLVED,
      threshold: { minimumTemperature: temperature },
    });
    await this.turnOff('Temperature normalized');
  }

  // ── Core fan actions ──

  private async turnOn(reason: FanReason) {
    const payload =
      this.configService.get<string>(
        'MQTT_FAN_ON_PAYLOAD',
      ) ?? '1';

    await this.publish(payload);

    this.fanOn = true;
    this.fanReason = reason;
    this.fanUpdatedAt = new Date().toISOString();
    this.emitFanState();

    this.logger.log(`Fan turned ON (${reason})`);
  }

  private async turnOff(reason: FanReason) {
    const payload =
      this.configService.get<string>(
        'MQTT_FAN_OFF_PAYLOAD',
      ) ?? '0';

    await this.publish(payload);

    this.fanOn = false;
    this.fanReason = reason;
    this.fanUpdatedAt = new Date().toISOString();
    this.emitFanState();

    this.logger.log(`Fan turned OFF (${reason})`);
  }

  // ── MQTT publish ──

  private async publish(payload: string) {
    const fanTopic =
      this.configService.get<string>(
        'MQTT_FAN_TOPIC',
      );

    if (!fanTopic) {
      throw new ServiceUnavailableException(
        'MQTT_FAN_TOPIC is not configured',
      );
    }

    if (!this.client?.connected) {
      throw new ServiceUnavailableException(
        'MQTT broker is not connected',
      );
    }

    await new Promise<void>(
      (resolve, reject) => {
        this.client!.publish(
          fanTopic,
          payload,
          (error) => {
            if (error) {
              this.logger.error(
                `Cannot publish fan command: ${error.message}`,
              );
              reject(error);
              return;
            }
            resolve();
          },
        );
      },
    );
  }

  // ── SSE helpers ──

  private emitFanState() {
    const state = this.getFanState();

    const key = `${state.on}:${state.mode}:${state.reason}`;

    if (key === this.lastEmittedFanKey) {
      return;
    }

    this.lastEmittedFanKey = key;

    this.fanUpdated$.next(state);
  }
}
