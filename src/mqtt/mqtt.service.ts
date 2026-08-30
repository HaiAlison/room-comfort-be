import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  MqttClient,
} from 'mqtt';

import { MonitoringService } from 'src/monitoring/monitoring.service';
import {
  FanCommand,
  ThresholdService,
} from 'src/threshold/threshold.service';

@Injectable()
export class MqttService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger =
    new Logger(MqttService.name);

  private client?: MqttClient;

  // Giữ tạm temperature và humidity
  // vì chúng đến từ 2 MQTT topic khác nhau
  private pendingTemperature: number | null =
    null;

  private pendingHumidity: number | null =
    null;

  constructor(
    private readonly configService:
      ConfigService,

    private readonly monitoringService:
      MonitoringService,

    private readonly thresholdService:
      ThresholdService,
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
      reconnectPeriod: 5000,
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
    const command =
      await this.thresholdService
        .evaluateTemperature(
          temperature,
        );

    if (!command) {
      this.logger.warn(
        'No threshold configured',
      );
      return;
    }

    this.publishFanCommand(
      command,
    );
  }

  private publishFanCommand(
    command: FanCommand,
  ) {
    const fanTopic =
      this.configService.get<string>(
        'MQTT_FAN_TOPIC',
      );

    if (!fanTopic) {
      this.logger.error(
        'MQTT_FAN_TOPIC is not configured',
      );
      return;
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

    this.client?.publish(
      fanTopic,
      payload,
      (error) => {
        if (error) {
          this.logger.error(
            `Cannot publish fan command: ${error.message}`,
          );
          return;
        }

        this.logger.log(
          `Fan command sent: ${payload}`,
        );
      },
    );
  }

  onModuleDestroy() {
    this.client?.end();
  }
}