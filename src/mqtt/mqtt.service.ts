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
  implements
    OnModuleInit,
    OnModuleDestroy
{
  private readonly logger =
    new Logger(MqttService.name);

  private client?: MqttClient;

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
      ) ??
      'mqtt://20.3.145.60:1883';

    const username =
      this.configService.get<string>(
        'MQTT_USERNAME',
      );

    const password =
      this.configService.get<string>(
        'MQTT_PASSWORD',
      );

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

        this.subscribeTemperature();
      },
    );

    this.client.on(
      'message',
      async (topic, payload) => {
        await this.handleMessage(
          topic,
          payload,
        );
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
  }

  private subscribeTemperature() {
    const topic =
      this.configService.get<string>(
        'MQTT_TEMPERATURE_TOPIC',
      ) ??
      'test/temperature';

    this.client?.subscribe(
      topic,
      (error) => {
        if (error) {
          this.logger.error(
            `Cannot subscribe to ${topic}`,
          );

          return;
        }

        this.logger.log(
          `Subscribed to ${topic}`,
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
      ) ??
      'test/temperature';

    if (topic !== temperatureTopic) {
      return;
    }

    const temperature =
      this.parseTemperature(payload);

    if (temperature === null) {
      this.logger.warn(
        `Invalid temperature payload: ${payload.toString()}`,
      );

      return;
    }

    this.logger.log(
      `Temperature received: ${temperature}`,
    );

    await this.handleTemperature(
      temperature,
    );
  }

  private parseTemperature(
    payload: Buffer,
  ): number | null {
    const raw =
      payload.toString().trim();

    const directValue =
      Number(raw);

    if (
      Number.isFinite(directValue)
    ) {
      return directValue;
    }

    try {
      const data =
        JSON.parse(raw);

      const temperature =
        Number(data.temperature);

      if (
        Number.isFinite(
          temperature,
        )
      ) {
        return temperature;
      }
    } catch {
      return null;
    }

    return null;
  }

  private async handleTemperature(
    temperature: number,
  ) {
    const roomId =
      this.configService.get<string>(
        'MQTT_ROOM_ID',
      ) ??
      'room-1';

    await this.monitoringService
      .saveSensorReading(
        roomId,
        temperature,
      );

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
    const topic =
      this.configService.get<string>(
        'MQTT_FAN_TOPIC',
      ) ??
      'test/fan';

    const onPayload =
      this.configService.get<string>(
        'MQTT_FAN_ON_PAYLOAD',
      ) ??
      'ON';

    const offPayload =
      this.configService.get<string>(
        'MQTT_FAN_OFF_PAYLOAD',
      ) ??
      'OFF';

    const payload =
      command === 'ON'
        ? onPayload
        : offPayload;

    this.client?.publish(
      topic,
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