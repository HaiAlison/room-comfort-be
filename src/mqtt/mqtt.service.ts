import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  MqttClient,
} from 'mqtt';
import { Observable, Subject } from 'rxjs';
import { AlertsService } from 'src/alerts/alerts.service';

import { MonitoringService } from 'src/monitoring/monitoring.service';
import {
  FanCommand,
  ThresholdService,
} from 'src/threshold/threshold.service';
import { EAlertSeverity, EAlertStatus } from 'src/utils/common/type';

@Injectable()
export class MqttService
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger =
    new Logger(MqttService.name);

  private client?: MqttClient;

  // Giữ tạm temperature và humidity
  // vì chúng đến từ 2 MQTT topic khác nhau
  private pendingTemperature: number | null =
    null;

  private pendingHumidity: number | null =
    null;
  private fanOn = false;

  private fanMode: 'auto' | 'manual' =
    'auto';

  private fanReason:
    | 'Temperature exceeded threshold'
    | 'Temperature normalized'
    | 'Manual override' =
    'Temperature normalized';

  private fanUpdatedAt =
    new Date().toISOString();

  /** Event bus: emits fan state every time it changes (manual or auto). */
  private readonly fanUpdated$ =
    new Subject<ReturnType<MqttService['getFanState']>>();

  /** Last emitted on/mode pair — auto-eval republishes the same command
   *  every reading cycle; only push to SSE when state actually changed. */
  private lastEmittedFanKey: string | null =
    null;

  constructor(
    private readonly configService:
      ConfigService,

    private readonly monitoringService:
      MonitoringService,

    private readonly thresholdService:
      ThresholdService,
    private readonly alertService: AlertsService
  ) {}

  onModuleInit() {
    this.connectBroker();
  }

  private connectBroker() {
    const url =
      this.configService.get<string>(
        'MQTT_URL',
      );

    const username =
      this.configService.get<string>(
        'MQTT_USERNAME',
      );

    const password =
      this.configService.get<string>(
        'MQTT_PASSWORD',
      );

    if (!url) {
      this.logger.error(
        'MQTT_URL is not configured',
      );
      return;
    }

    this.client = connect(url, {
      username,
      password,
      reconnectPeriod: 0,
    });

    this.client.on(
      'connect',
      () => {
        this.logger.log(
          'Connected to MQTT broker',
        );

        this.subscribeSensorTopics();
      },
    );

    this.client.on(
      'message',
      async (topic, payload) => {
        try {
          await this.handleMessage(
            topic,
            payload,
          );
        } catch (error) {
          this.logger.error(
            'Error handling MQTT message',
            error instanceof Error
              ? error.stack
              : undefined,
          );
        }
      },
    );

    this.client.on(
      'error',
      (error) => {
        this.logger.error(
          `MQTT error: ${error.message}`,
        );
      },
    );

    this.client.on(
      'reconnect',
      () => {
        this.logger.warn(
          'Reconnecting to MQTT broker...',
        );
      },
    );
  }

  private subscribeSensorTopics() {
    const temperatureTopic =
      this.configService.get<string>(
        'MQTT_TEMPERATURE_TOPIC',
      );

    const humidityTopic =
      this.configService.get<string>(
        'MQTT_HUMIDITY_TOPIC',
      );

    if (!temperatureTopic) {
      this.logger.error(
        'MQTT_TEMPERATURE_TOPIC is not configured',
      );
      return;
    }

    if (!humidityTopic) {
      this.logger.error(
        'MQTT_HUMIDITY_TOPIC is not configured',
      );
      return;
    }

    this.client?.subscribe(
      [
        temperatureTopic,
        humidityTopic,
      ],
      (error) => {
        if (error) {
          this.logger.error(
            `Cannot subscribe sensor topics: ${error.message}`,
          );
          return;
        }

        this.logger.log(
          `Subscribed to ${temperatureTopic}`,
        );

        this.logger.log(
          `Subscribed to ${humidityTopic}`,
        );
      },
    );
  }

  private async handleMessage(
    topic: string,
    payload: Buffer,
  ) {
    const temperatureTopic =
      this.configService.get<string>(
        'MQTT_TEMPERATURE_TOPIC',
      );

    const humidityTopic =
      this.configService.get<string>(
        'MQTT_HUMIDITY_TOPIC',
      );

    if (topic === temperatureTopic) {
      await this.handleTemperatureMessage(
        payload,
      );

      return;
    }

    if (topic === humidityTopic) {
      await this.handleHumidityMessage(
        payload,
      );
    }
  }

  private async handleTemperatureMessage(
    payload: Buffer,
  ) {
    const temperature =
      this.parseNumber(payload);

    if (temperature === null) {
      this.logger.warn(
        `Invalid temperature payload: ${payload.toString()}`,
      );
      return;
    }

    this.pendingTemperature =
      temperature;

    this.logger.log(
      `Temperature received: ${temperature}`,
    );

    // Fan chỉ phụ thuộc temperature,
    // nên kiểm tra threshold ngay
    await this.evaluateFan(
      temperature,
    );

    // Nếu humidity cũng đã tới,
    // lưu một SensorReading hoàn chỉnh
    await this.saveReadingIfReady();
  }

  private async handleHumidityMessage(
    payload: Buffer,
  ) {
    const humidity =
      this.parseNumber(payload);

    if (humidity === null) {
      this.logger.warn(
        `Invalid humidity payload: ${payload.toString()}`,
      );
      return;
    }

    this.pendingHumidity =
      humidity;

    this.logger.log(
      `Humidity received: ${humidity}`,
    );

    await this.saveReadingIfReady();
  }

  private parseNumber(
    payload: Buffer,
  ): number | null {
    const value = Number(
      payload.toString().trim(),
    );

    if (!Number.isFinite(value)) {
      return null;
    }

    return value;
  }

  private async saveReadingIfReady() {
    if (
      this.pendingTemperature === null ||
      this.pendingHumidity === null
    ) {
      return;
    }

    const temperature =
      this.pendingTemperature;

    const humidity =
      this.pendingHumidity;

    await this.monitoringService
      .saveSensorReading(
        temperature,
        humidity,
      );

    this.logger.log(
      `Sensor reading saved: temperature=${temperature}, humidity=${humidity}`,
    );

    // Đã ghép thành một record rồi
    // thì reset để chờ cặp dữ liệu tiếp theo
    this.pendingTemperature = null;
    this.pendingHumidity = null;
  }

  private async evaluateFan(
    temperature: number,
  ) {
    if (this.fanMode === 'manual') {
      return;
    }

    const command =
      await this.thresholdService
        .evaluateTemperature(
          temperature,
        );

    if (!command) {
      return;
    }

    const shouldBeOn = command === 'ON';
    if (this.fanOn === shouldBeOn) {
      return;
    }

    const reason =
      command === 'ON'
        ? 'Temperature exceeded threshold'
        : 'Temperature normalized';

    switch (command) {
      case 'ON': {
        this.logger.log(
          `Temperature exceeded threshold: ${temperature}`,
        );
        await this.alertService.createAlert({
          severity: EAlertSeverity.CRITICAL,
          message: `Temperature exceeded threshold: ${temperature}`,
          status: EAlertStatus.ACTIVE,
          threshold: {
            maximumTemperature: temperature,
          },
        });
        break;
      }
      case 'OFF': {
        this.logger.log(
          `Temperature normalized: ${temperature}`,
        );
        await this.alertService.createAlert({
          severity: EAlertSeverity.INFO,
          message: `Temperature has been normalized: ${temperature}`,
          status: EAlertStatus.RESOLVED,
          threshold: {
            minimumTemperature: temperature,
          },
        });
        break;
      }
      default:
        break;
    }

    await this.publishFanCommand(
      command,
      reason,
    );
  }

  private async publishFanCommand(
    command: FanCommand,
    reason:
      | 'Temperature exceeded threshold'
      | 'Temperature normalized'
      | 'Manual override',
  ) {
    const fanTopic =
      this.configService.get<string>(
        'MQTT_FAN_TOPIC',
      );

    if (!fanTopic) {
      this.logger.error(
        'MQTT_FAN_TOPIC is not configured',
      );

      throw new ServiceUnavailableException(
        'MQTT fan topic is not configured',
      );
    }

    const onPayload =
      this.configService.get<string>(
        'MQTT_FAN_ON_PAYLOAD',
      ) ?? '1';

    const offPayload =
      this.configService.get<string>(
        'MQTT_FAN_OFF_PAYLOAD',
      ) ?? '0';

    const payload =
      command === 'ON'
        ? onPayload
        : offPayload;

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

    this.fanOn =
      command === 'ON';

    this.fanReason =
      reason;

    this.fanUpdatedAt =
      new Date().toISOString();

    this.emitFanState();

    this.logger.log(
      `Fan command sent: ${payload}`,
    );
  }

  onModuleDestroy() {
    this.client?.end();
  }

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
    ReturnType<MqttService['getFanState']>
  > {
    return this.fanUpdated$.asObservable();
  }

  private emitFanState() {
    const state = this.getFanState();

    const key = `${state.on}:${state.mode}:${state.reason}`;

    if (key === this.lastEmittedFanKey) {
      return;
    }

    this.lastEmittedFanKey = key;

    this.fanUpdated$.next(state);
  }

  async setManualFan(
    on: boolean,
  ) {
    const previousMode =
      this.fanMode;

    this.fanMode =
      'manual';

    try {
      await this.publishFanCommand(
        on ? 'ON' : 'OFF',
        'Manual override',
      );
    } catch (error) {
      this.fanMode =
        previousMode;

      throw error;
    }

    return this.getFanState();
  }

  async setFanMode(
    mode: 'auto' | 'manual',
  ) {
    this.fanMode =
      mode;

    this.fanUpdatedAt =
      new Date().toISOString();

    this.emitFanState();

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

}