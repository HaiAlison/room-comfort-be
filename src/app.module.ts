import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmAsyncConfig } from './utils/config/database/config.service';
import { join } from 'path';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { AlertsModule } from './alerts/alerts.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { DevicesModule } from './devices/devices.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['.env'], isGlobal: true }),
    ConfigModule,
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    I18nModule.forRoot({
      fallbackLanguage: process.env.DEFAULT_LANGUAGE,
      loaderOptions: {
        path: join(__dirname, 'utils/i18n/'),
        watch: true,
      },
      resolvers: [new HeaderResolver(['x-language'])],
    }),
    AlertsModule,
    ActivityLogsModule,
    // MqttModule must register BEFORE DevicesModule: both mount @Controller('devices'),
    // and DevicesController's GET /devices/:deviceId would otherwise shadow
    // DeviceController's static GET /devices/fan (deviceId = "fan" -> 404).
    MqttModule,
    DevicesModule,
    MonitoringModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
